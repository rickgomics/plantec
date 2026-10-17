export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Projetos do gerenciador (plantecpm) com o BOM que saiu de cada um
// (17/10/2026, pedido do usuário: "no Painel de Projetos integrar os BOMs
// efetuados nos registros de Projetos e contabilizar os entregues além do
// tempo"). Quem lê é o Cockpit, servidor a servidor.
//
// Fica aqui, e não no Cockpit, porque a chave do gerenciador já mora neste
// app (a mesma de /open/[externalId]); o Cockpit faz uma chamada só e recebe
// os dois lados juntos. O cálculo de prazo é do Cockpit — aqui só os fatos:
// quando o projeto foi aberto, a complexidade e quando o BOM foi enviado.

const EXT_URL = (process.env.EXTERNAL_PROJECTS_URL ?? '').replace(/\/$/, '')
const EXT_TOKEN = process.env.EXTERNAL_PROJECTS_TOKEN ?? ''
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

interface ExternalProject {
  id: string
  title: string
  vertical: string
  createdAt: string
  customer?: { companyName?: string | null }
  _meta?: {
    internalId?: number
    projectNumber?: string | null
    manager?: string | null
    seller?: string | null
    manufacturer?: string | null
    status?: string | null
    value?: number | null
    complexity?: number | null
    timeHours?: string | null
  }
}

let cache: { em: number; lista: ExternalProject[] } | null = null
const CACHE_MS = 5 * 60 * 1000

async function projetosDoGerenciador(): Promise<ExternalProject[]> {
  if (cache && Date.now() - cache.em < CACHE_MS) return cache.lista
  const headers: Record<string, string> = {}
  if (EXT_TOKEN) headers['Authorization'] = `Bearer ${EXT_TOKEN}`
  const res = await fetch(`${EXT_URL}/projects`, { headers, cache: 'no-store', signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`gerenciador de projetos respondeu HTTP ${res.status}`)
  const data = await res.json()
  const lista: ExternalProject[] = Array.isArray(data) ? data : (data.projects ?? [])
  cache = { em: Date.now(), lista }
  return lista
}

export async function GET() {
  if (!EXT_URL) {
    return NextResponse.json({ error: 'EXTERNAL_PROJECTS_URL não configurada no BOM Builder' }, { status: 503 })
  }
  try {
    const [lista, propostas] = await Promise.all([
      projetosDoGerenciador(),
      prisma.proposal.findMany({
        where: { externalProjectId: { not: null } },
        select: {
          id: true,
          number: true,
          status: true,
          externalProjectId: true,
          createdAt: true,
          updatedAt: true,
          sentAt: true,
          generatedAt: true,
          totalPrice: true,
        },
      }),
    ])
    const bomPorProjeto = new Map(propostas.map((p) => [p.externalProjectId!, p]))

    const projetos = lista.map((p) => {
      const m = p._meta ?? {}
      const bom = bomPorProjeto.get(p.id)
      return {
        pmId: p.id,
        // No gerenciador, "projectNumber" é o código do Projeto Registrado
        // no Portal (às vezes vem o número do orçamento no lugar).
        numeroPortal: m.projectNumber ? String(m.projectNumber).trim() : null,
        titulo: p.title,
        cliente: p.customer?.companyName ?? null,
        vertical: p.vertical,
        gerente: m.manager ?? null,
        vendedor: m.seller ?? null,
        fabricante: m.manufacturer ?? null,
        status: m.status ?? null,
        valor: m.value ?? null,
        complexidade: m.complexity ?? null,
        horas: m.timeHours ? Number(m.timeHours) : null,
        abertoEm: p.createdAt,
        // Abre o BOM existente ou cria a proposta a partir do projeto.
        abrirUrl: `${BASE_PATH}/open/${encodeURIComponent(p.id)}`,
        bom: bom
          ? {
              id: bom.id,
              numero: bom.number,
              status: bom.status,
              criadoEm: bom.createdAt.toISOString(),
              atualizadoEm: bom.updatedAt.toISOString(),
              geradoEm: bom.generatedAt ? bom.generatedAt.toISOString() : null,
              enviadoEm: bom.sentAt ? bom.sentAt.toISOString() : null,
              total: Number(bom.totalPrice),
              url: `${BASE_PATH}/proposals/${bom.id}`,
              // A rota do PDF devolve o documento paginado pronto para imprimir/salvar.
              pdfUrl: `${BASE_PATH}/proposals/${bom.id}/pdf`,
            }
          : null,
      }
    })

    return NextResponse.json({ projetos, geradoEm: new Date().toISOString() })
  } catch (e) {
    console.error('[/api/integracao/projetos]', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
