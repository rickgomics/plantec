export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const HUB      = 'https://engenharia-aplicacao.intelbras.com.br/hub'
const HUB_USER = process.env.INTELBRAS_EMAIL    ?? ''
const HUB_PASS = process.env.INTELBRAS_PASSWORD ?? ''

const ENDPOINTS: Record<string, string> = {
  vip:             'list_vip.php',
  sd:              'list_sd.php',
  termicas:        'list_termicas.php',
  faciais:         'list_faciais.php',
  dvr:             'list_dvr.php',
  nvr:             'list_nvr.php',
  alarmes:         'list_alarmes.php',
  nobreaks:        'list_nobreaks.php',
  eletrificadores: 'list_eletrificadores.php',
}

// Module-level session cache — survives across requests, resets on server restart
let cachedSession: string | null = null
let sessionExpiry = 0

async function doLogin(email: string, password: string): Promise<string | null> {
  const res = await fetch(`${HUB}/api/auth/login_local.php`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
    body:    new URLSearchParams({ username: email, password }),
    redirect: 'manual',
    signal:  AbortSignal.timeout(12_000),
  })
  const rawCookie = res.headers.get('set-cookie') ?? ''
  const match = rawCookie.match(/PHPSESSID=([^;]+)/)
  if (!match) return null
  try {
    const data = await res.json()
    if (!data.success) return null
  } catch { return null }
  return `PHPSESSID=${match[1]}`
}

async function getSession(email: string, password: string): Promise<string | null> {
  if (cachedSession && Date.now() < sessionExpiry) return cachedSession
  const cookie = await doLogin(email, password)
  if (cookie) {
    cachedSession  = cookie
    sessionExpiry  = Date.now() + 6 * 60 * 60 * 1000  // 6 h
  }
  return cookie
}

async function fetchHub(phpFile: string, params: URLSearchParams, session: string) {
  return fetch(`${HUB}/api/comparativos/${phpFile}?${params}`, {
    headers: { Cookie: session, Accept: 'application/json' },
    signal:  AbortSignal.timeout(15_000),
  })
}

// ── Switches (redes_enterprise 2-step wizard) ──────────────────────────────────

async function handleSwitches(
  sp: URLSearchParams,
  session: string,
  email: string,
  password: string,
): Promise<NextResponse> {
  const alimentacao = sp.get('alimentacao') ?? ''
  const poe         = sp.get('poe')         ?? ''
  const poeFaixa    = sp.get('poe_faixa')   ?? ''

  // Require at least alimentacao + poe to call step1_validate
  if (!alimentacao || !poe) {
    return NextResponse.json({ success: true, items: [], total: 0 })
  }

  const step1Params = new URLSearchParams({
    action:       'step1_validate',
    alimentacao,
    poe,
    uplink_qtd:   '',
    uplink_vel:   '',
    downlink_qtd: '',
    downlink_vel: '',
    enlace_tipo:  '',
  })
  if (poe === 'SIM' && poeFaixa) step1Params.set('poe_faixa', poeFaixa)

  const callStep1 = (sess: string) =>
    fetch(`${HUB}/api/enterprise/step1.php?${step1Params}`, {
      headers: { Cookie: sess, Accept: 'application/json' },
      signal:  AbortSignal.timeout(15_000),
    })

  let step1Res = await callStep1(session)

  if (step1Res.status === 401 || step1Res.status === 302 || step1Res.redirected) {
    cachedSession = null; sessionExpiry = 0
    const fresh = await getSession(email, password)
    if (!fresh) return NextResponse.json({ error: 'Sessão expirada — re-autenticação falhou.' }, { status: 401 })
    session  = fresh
    step1Res = await callStep1(session)
  }

  try {
    const s1 = await step1Res.json()
    if (!s1.success) return NextResponse.json({ error: s1.error ?? 'Erro no step1 switches.' }, { status: 502 })
  } catch {
    return NextResponse.json({ error: 'Resposta inválida do step1.' }, { status: 502 })
  }

  // Step 2: list switches filtered by session state
  const step2Params = new URLSearchParams({ action: 'get' })
  const q = sp.get('q'); if (q) step2Params.set('q', q)
  const fonte = sp.get('fonte_redundante'); if (fonte) step2Params.set('fonte_redundante', fonte)
  const ospf  = sp.get('ospf_rip');        if (ospf)  step2Params.set('ospf_rip', ospf)
  const mpls  = sp.get('mpls');            if (mpls)  step2Params.set('mpls', mpls)
  const mpBgp = sp.get('mp_bgp');          if (mpBgp) step2Params.set('mp_bgp', mpBgp)

  const step2Res = await fetch(`${HUB}/api/enterprise/step2.php?${step2Params}`, {
    headers: { Cookie: session, Accept: 'application/json' },
    signal:  AbortSignal.timeout(15_000),
  })

  let step2Data: Record<string, unknown>
  try { step2Data = await step2Res.json() }
  catch { return NextResponse.json({ error: 'Resposta inválida do step2.' }, { status: 502 }) }

  if (!step2Data.success) {
    return NextResponse.json({ error: step2Data.error ?? 'Erro no step2.' }, { status: 502 })
  }

  type RawSwitch = {
    code:   unknown
    title:  unknown
    specs?: Record<string, unknown>
    raw?:   Record<string, unknown>
    image?: unknown
  }

  const items = ((step2Data.items ?? []) as RawSwitch[]).map((p, i) => {
    const raw = p.raw ?? {}
    return {
      id:             i + 1,
      codigo_produto: String(p.code ?? ''),
      produto:        String(p.title ?? ''),
      modelo:         String(p.title ?? ''),
      phaseout:       false,
      tags:           [] as string[],
      imagem_url:     p.image ? String(p.image) : null,
      ...raw,
      specs:          p.specs,
    }
  })

  return NextResponse.json(rewriteImageUrls({ success: true, items, total: items.length }))
}

// ── Serviços SVA ───────────────────────────────────────────────────────────────

async function handleServicos(
  sp: URLSearchParams,
  session: string,
  email: string,
  password: string,
): Promise<NextResponse> {
  const page     = sp.get('page')     ?? '1'
  const pageSize = sp.get('pageSize') ?? '12'
  const q        = sp.get('q')        ?? ''
  const catSvc   = sp.get('categoria_servico')  ?? ''
  const catProd  = sp.get('categoria_produto')  ?? ''

  const params = new URLSearchParams({
    page,
    limit: pageSize,
    q,
    sort: 'descricao_codigo',
    dir:  'ASC',
  })
  if (catSvc)  params.set('categoria_servico',  catSvc)
  if (catProd) params.set('categoria_produto',   catProd)

  const callServicos = (sess: string) =>
    fetch(`${HUB}/api/servicos/servicos_sva.php?${params}`, {
      headers: { Cookie: sess, Accept: 'application/json' },
      signal:  AbortSignal.timeout(15_000),
    })

  let res = await callServicos(session)

  if (res.status === 401 || res.status === 302 || res.redirected) {
    cachedSession = null; sessionExpiry = 0
    const fresh = await getSession(email, password)
    if (!fresh) return NextResponse.json({ error: 'Sessão expirada — re-autenticação falhou.' }, { status: 401 })
    session = fresh
    res     = await callServicos(session)
  }

  let data: Record<string, unknown>
  try { data = await res.json() }
  catch { return NextResponse.json({ error: 'Resposta inválida dos serviços.' }, { status: 502 }) }

  if (!data.ok) {
    return NextResponse.json({ error: data.error ?? 'Erro ao listar serviços.' }, { status: 502 })
  }

  type RawSvc = Record<string, unknown>

  const items = ((data.data ?? []) as RawSvc[]).map(s => ({
    id:                  Number(s.id),
    codigo_produto:      String(s.cod_produto ?? ''),
    cod_produto:         String(s.cod_produto ?? ''),
    produto:             String(s.descricao_codigo ?? ''),
    phaseout:            false,
    tags:                [s.categoria_servico, s.categoria_produto].filter(Boolean) as string[],
    imagem_url:          null,
    atendimento:         s.atendimento,
    categoria_servico:   s.categoria_servico,
    categoria_produto:   s.categoria_produto,
    descricao_detalhada: s.descricao_detalhada,
    forma_cobranca:      s.forma_cobranca,
  }))

  return NextResponse.json({
    success:  true,
    items,
    total:    Number(data.total ?? items.length),
    page:     Number(page),
    pageSize: Number(pageSize),
  })
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const sp   = new URL(req.url).searchParams
  const type = sp.get('type') ?? 'vip'

  const email    = sp.get('email')    || HUB_USER
  const password = sp.get('password') || HUB_PASS
  if (!email || !password) {
    return NextResponse.json({ error: 'Credenciais do Hub Intelbras não configuradas.' }, { status: 401 })
  }

  let session = await getSession(email, password)
  if (!session) return NextResponse.json({ error: 'Falha na autenticação com o Hub Intelbras.' }, { status: 401 })

  if (type === 'switches') return handleSwitches(sp, session, email, password)
  if (type === 'servicos') return handleServicos(sp, session, email, password)

  // ── Standard comparativo ───────────────────────────────────────────────────
  const phpFile = ENDPOINTS[type]
  if (!phpFile) return NextResponse.json({ error: `Tipo inválido: ${type}` }, { status: 400 })

  // Build params to forward (strip meta params)
  const forward = new URLSearchParams()
  sp.forEach((v, k) => {
    if (!['type', 'email', 'password'].includes(k)) forward.append(k, v)
  })

  let res = await fetchHub(phpFile, forward, session)

  // Session may have expired on the server side — retry once with a fresh login
  if (res.status === 401 || res.status === 302 || res.redirected) {
    cachedSession = null
    sessionExpiry = 0
    session = await getSession(email, password)
    if (!session) return NextResponse.json({ error: 'Sessão expirada — re-autenticação falhou.' }, { status: 401 })
    res = await fetchHub(phpFile, forward, session)
  }

  try {
    const data = await res.json()
    return NextResponse.json(rewriteImageUrls(data))
  } catch {
    return NextResponse.json({ error: 'Resposta inválida do Hub Intelbras.' }, { status: 502 })
  }
}

// Rewrite imagem_url paths to go through our proxy so the browser never
// hits the Intelbras domain directly and benefits from our Cache-Control.
function rewriteImageUrls(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(rewriteImageUrls)
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => {
        if (k === 'imagem_url' && typeof v === 'string' && v.startsWith('/assets/img/')) {
          return [k, `/api/intelbras/image?path=${encodeURIComponent(v)}`]
        }
        return [k, rewriteImageUrls(v)]
      })
    )
  }
  return data
}
