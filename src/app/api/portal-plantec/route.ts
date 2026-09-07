export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const PORTAL_URL      = (process.env.PORTAL_PLANTEC_URL      ?? 'https://portal.plantec.com').replace(/\/$/, '')
const PORTAL_EMAIL    = process.env.PORTAL_PLANTEC_EMAIL    ?? ''
const PORTAL_PASSWORD = process.env.PORTAL_PLANTEC_PASSWORD ?? ''

export interface PortalItem {
  code:      string   // REFERÊNCIA (Plantec internal code)
  name:      string   // DESCRIÇÃO
  quantity:  number   // QDE
  unitPrice: number   // VR.UNITÁRIO
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function tryLogin(url: string, email: string, password: string): Promise<string | null> {
  const formBody = new URLSearchParams({ email, senha: password })
  const res = await fetch(url, {
    method:   'POST',
    headers:  { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:     formBody.toString(),
    redirect: 'manual',
    signal:   AbortSignal.timeout(15_000),
  })

  const rawCookie = res.headers.get('set-cookie') ?? ''
  const sessionMatch = rawCookie.match(/PHPSESSID=([^;]+)/)
  if (!sessionMatch) return null
  const phpSession = `PHPSESSID=${sessionMatch[1]}`

  if (res.status === 302 || res.status === 301) return phpSession

  const html = await res.text()
  if (
    html.includes('nválidos') || html.includes('nvalidos') ||
    html.includes('senha incorreta') || html.includes('Usuário ou senha')
  ) return null

  return phpSession
}

async function portalLogin(email: string, password: string): Promise<string | null> {
  const s1 = await tryLogin(`${PORTAL_URL}/adobe/loginunico`, email, password)
  if (s1) return s1
  return tryLogin(`${PORTAL_URL}/home/loginunico_v2`, email, password)
}

// ── Fetch page ────────────────────────────────────────────────────────────────

async function fetchPage(path: string, sessionCookie: string): Promise<{ html: string; ok: boolean }> {
  const res = await fetch(`${PORTAL_URL}${path}`, {
    headers: { 'Cookie': sessionCookie, 'Accept': 'text/html' },
    redirect: 'follow',
    signal:   AbortSignal.timeout(15_000),
  })
  const html = await res.text()
  // Redirected to home = no permission
  const noAccess = html.includes('permissao de acesso') || html.includes('permissão de acesso')
  return { html, ok: res.ok && !noAccess }
}

// ── HTML parser for /revenda/orcamentorevendaitens/{id} ────────────────────────
// Columns: ITEM | REFERÊNCIA | DESCRIÇÃO | FABRICANTE | UN | NCM | QDE | VR.UNITÁRIO | IPI | VR.TOTAL

function stripTags(s: string): string {
  // Remove content inside comments, scripts, and divs (mini-modal) before stripping tags
  const noComments = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|div|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
  return noComments.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
}

function parseCurrency(raw: string): number {
  const cleaned = raw.replace(/R\$\s*/g, '').replace(/\s/g, '').trim()
  // Brazilian: 1.234,56
  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
  }
  return parseFloat(cleaned.replace(',', '.')) || 0
}

function parsePortalItems(html: string): PortalItem[] {
  const items: PortalItem[] = []

  // Extract all <tr> rows
  const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? []

  for (const row of rowMatches) {
    // Extract <td> cells
    const cellMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? []
    if (cellMatches.length < 8) continue

    const cells = cellMatches.map(c => {
      const inner = c.replace(/^<td[^>]*>/i, '').replace(/<\/td>$/i, '')
      return stripTags(inner)
    })

    // Column indices based on portal table:
    // 0=ITEM, 1=REFERÊNCIA, 2=DESCRIÇÃO, 3=FABRICANTE, 4=UN, 5=NCM, 6=QDE, 7=VR.UNITÁRIO, 8=IPI, 9=VR.TOTAL
    const name = cells[2] ?? ''
    if (!name || name === 'DESCRIÇÃO' || name.length < 3) continue

    const code     = (cells[1] ?? '').replace(/[^0-9A-Za-z\-\.]/g, '').trim()
    const qty      = parseInt((cells[6] ?? '1').replace(/[^\d]/g, '')) || 1
    const priceRaw = cells[7] ?? '0'

    // Skip rows where price column doesn't have a currency value (footer/header rows)
    if (!priceRaw.includes('R$') && !priceRaw.match(/^\d/)) continue

    const unitPrice = parseCurrency(priceRaw)

    items.push({ code, name, quantity: qty, unitPrice })
  }

  return items
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { quotationId, email, password } = body as {
      quotationId: string
      email?: string
      password?: string
    }

    if (!quotationId) {
      return NextResponse.json({ error: 'quotationId é obrigatório' }, { status: 400 })
    }

    const loginEmail    = (email    || PORTAL_EMAIL).trim()
    const loginPassword = (password || PORTAL_PASSWORD).trim()

    if (!loginEmail || !loginPassword) {
      return NextResponse.json({
        error: 'Credenciais do Portal Plantec não configuradas. Informe email e senha ou defina PORTAL_PLANTEC_EMAIL e PORTAL_PLANTEC_PASSWORD no .env.',
      }, { status: 401 })
    }

    // 1. Login
    const session = await portalLogin(loginEmail, loginPassword)
    if (!session) {
      return NextResponse.json({ error: 'Usuário ou senha inválidos no Portal Plantec.' }, { status: 401 })
    }

    // 2. Try revenda path (reseller quotation)
    const revendaPath = `/revenda/orcamentorevendaitens/${quotationId}`
    const { html: revendaHtml, ok: revendaOk } = await fetchPage(revendaPath, session)

    let html = revendaHtml
    if (!revendaOk) {
      // Fallback: try gerencia path (management view)
      const gerenciaPath = `/gerencia/orcamentoitens/${quotationId}`
      const { html: gerenciaHtml, ok: gerenciaOk } = await fetchPage(gerenciaPath, session)
      if (!gerenciaOk) {
        return NextResponse.json({
          error: `Orçamento ${quotationId} não encontrado ou sem permissão de acesso.`,
        }, { status: 404 })
      }
      html = gerenciaHtml
    }

    // 3. Parse items
    const items = parsePortalItems(html)
    if (items.length === 0) {
      return NextResponse.json({
        error: `Nenhum item encontrado no orçamento ${quotationId}. Verifique se o número está correto.`,
      }, { status: 404 })
    }

    return NextResponse.json({ items, count: items.length })

  } catch (err) {
    console.error('[/api/portal-plantec] error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Erro ao importar orçamento: ${msg}` }, { status: 500 })
  }
}
