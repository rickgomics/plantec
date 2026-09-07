export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const EXT_URL   = (process.env.EXTERNAL_PROJECTS_URL  ?? '').replace(/\/$/, '')
const EXT_TOKEN = process.env.EXTERNAL_PROJECTS_TOKEN ?? ''

interface ExternalCustomer {
  companyName: string
  cnpj?:        string | null
  contactName?: string | null
  email?:       string | null
  phone?:       string | null
  city?:        string | null
  state?:       string | null
}

interface ExternalMeta {
  internalId?:    number
  projectNumber?: string
  manager?:       string
  seller?:        string
  manufacturer?:  string
  status?:        string
  value?:         number
  complexity?:    number
  timeHours?:     string
}

interface ExternalProject {
  id:        string
  title:     string
  vertical:  string
  scope?:    string
  createdAt: string
  customer:  ExternalCustomer
  _meta?:    ExternalMeta
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function generateProposalNumber(): Promise<string> {
  const year  = new Date().getFullYear()
  const count = await prisma.proposal.count({
    where: { number: { startsWith: `PLT-${year}-` } },
  })
  return `PLT-${year}-${String(count + 1).padStart(3, '0')}`
}

async function findOrCreateCustomer(c: ExternalCustomer): Promise<string> {
  if (c.cnpj) {
    const existing = await prisma.customer.findUnique({ where: { cnpj: c.cnpj } })
    if (existing) return existing.id
  }
  const byName = await prisma.customer.findFirst({
    where: { companyName: { equals: c.companyName, mode: 'insensitive' } },
  })
  if (byName) return byName.id

  const created = await prisma.customer.create({
    data: {
      companyName: c.companyName,
      cnpj:        c.cnpj        ?? null,
      contactName: c.contactName ?? null,
      email:       c.email       ?? null,
      phone:       c.phone       ?? null,
      city:        c.city        ?? null,
      state:       c.state       ?? null,
      active: true,
    },
  })
  return created.id
}

async function fetchExternalProject(externalId: string): Promise<ExternalProject | null> {
  if (!EXT_URL) return null
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (EXT_TOKEN) headers['Authorization'] = `Bearer ${EXT_TOKEN}`

    const res = await fetch(`${EXT_URL}/projects`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null

    const data = await res.json()
    const list: ExternalProject[] = Array.isArray(data) ? data : (data.projects ?? [])
    return list.find(p => p.id === externalId) ?? null
  } catch {
    return null
  }
}

function buildScope(project: ExternalProject): string {
  const lines: string[] = []
  if (project.scope) lines.push(project.scope)

  const m = project._meta
  if (m) {
    lines.push('')
    if (m.projectNumber) lines.push(`Nº do projeto: ${m.projectNumber}`)
    if (m.manager)       lines.push(`Gerente: ${m.manager}`)
    if (m.seller)        lines.push(`Vendedor: ${m.seller}`)
    if (m.manufacturer)  lines.push(`Fabricante preferido: ${m.manufacturer}`)
    if (m.status)        lines.push(`Status: ${m.status}`)
    if (m.value)         lines.push(`Valor estimado: R$ ${m.value.toLocaleString('pt-BR')}`)
    if (m.complexity)    lines.push(`Complexidade: ${m.complexity}/5`)
    if (m.timeHours)     lines.push(`Horas estimadas: ${m.timeHours}h`)
  }
  return lines.join('\n').trim()
}

function errorPage(title: string, body: string, status: number) {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} — Plantec BOM</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
    .card{background:#fff;border-radius:16px;box-shadow:0 4px 24px #0001;padding:2.5rem 3rem;max-width:480px;text-align:center}
    h2{margin:0 0 .75rem;color:#111;font-size:1.25rem}
    p{margin:0;color:#64748b;line-height:1.6;font-size:.95rem}
    code{background:#f1f5f9;border-radius:6px;padding:.2em .45em;font-size:.85em;color:#0f172a}
  </style>
</head>
<body>
  <div class="card">
    <h2>${title}</h2>
    <p>${body}</p>
  </div>
</body>
</html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Use the Host header so the redirect reflects the real hostname/port that the
// browser used, not the internal localhost Next.js sees for server-side requests.
// basePath must be included so NPM reverse-proxy routes correctly.
const BASE_PATH = (process.env.NEXT_BASE_PATH ?? '').replace(/\/$/, '')

function buildRedirect(req: NextRequest, path: string): string {
  const host     = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host
  const protocol = req.headers.get('x-forwarded-proto') ?? new URL(req.url).protocol.replace(':', '')
  return `${protocol}://${host}${BASE_PATH}${path}`
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { externalId: string } }
) {
  const { externalId } = params

  try {
    // 1. Check if a proposal already exists for this external project
    const existing = await prisma.proposal.findUnique({
      where:  { externalProjectId: externalId },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.redirect(buildRedirect(req, `/proposals/${existing.id}`))
    }

    // 2. Not found — fetch project from external API
    const project = await fetchExternalProject(externalId)

    if (!project) {
      return errorPage(
        'Projeto não encontrado',
        `Nenhum projeto com o ID <code>${externalId}</code> foi encontrado no sistema externo. Verifique se o ID está correto.`,
        404
      )
    }

    // 3. Auto-create proposal from external project data
    const [customerId, number] = await Promise.all([
      findOrCreateCustomer(project.customer),
      generateProposalNumber(),
    ])

    const proposal = await prisma.proposal.create({
      data: {
        number,
        title:             project.title,
        vertical:          project.vertical,
        customerId,
        scope:             buildScope(project),
        status:            'draft',
        discount:          0,
        totalCost:         0,
        totalPrice:        0,
        totalDiscount:     0,
        margin:            0,
        validityDays:      30,
        coverStyle:        'teal',
        externalProjectId: externalId,
      },
      select: { id: true },
    })

    return NextResponse.redirect(buildRedirect(req, `/proposals/${proposal.id}`))

  } catch (err) {
    console.error('[/open] error:', err)
    return errorPage(
      'Erro interno',
      'Ocorreu um erro ao processar a solicitação. Tente novamente em instantes.',
      500
    )
  }
}
