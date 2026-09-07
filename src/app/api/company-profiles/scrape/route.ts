export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const UA = 'Mozilla/5.0 (compatible; PlantecBOM/1.0)'

// ── HTML helpers ──────────────────────────────────────────────────────────────

function extractMeta(html: string, ...patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return ''
}

function resolveUrl(href: string, origin: string): string {
  if (!href) return ''
  if (href.startsWith('http')) return href
  if (href.startsWith('//')) return 'https:' + href
  if (href.startsWith('/')) return origin + href
  return origin + '/' + href
}

function extractLogoUrl(html: string, origin: string): string {
  // Priority: og:image > apple-touch-icon > PNG icon > any icon > img.logo
  const rules: RegExp[] = [
    /<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /<link\s+[^>]*rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*href=["']([^"']+)["']/i,
    /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*apple-touch-icon[^"']*["']/i,
    // PNG icons
    /<link\s+[^>]*rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+\.png[^"']*)["']/i,
    /<link\s+[^>]*href=["']([^"']+\.png[^"']*)["'][^>]*rel=["'][^"']*icon[^"']*["']/i,
    // Any icon
    /<link\s+[^>]*rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i,
    /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*icon[^"']*["']/i,
    // img tag with "logo" in alt/id/class
    /<img\s[^>]*(?:alt|id|class)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i,
    /<img\s[^>]*src=["']([^"']+)["'][^>]*(?:alt|id|class)=["'][^"']*logo[^"']*["']/i,
  ]

  for (const re of rules) {
    const m = html.match(re)
    if (m?.[1]) return resolveUrl(m[1].trim(), origin)
  }
  return ''
}

function extractBodyText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3500)
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rawUrl  = searchParams.get('url')
  const mode    = searchParams.get('mode')     // 'logo' to download image
  const logoUrl = searchParams.get('logoUrl')  // required when mode=logo

  if (!rawUrl) {
    return NextResponse.json({ error: 'url é obrigatório' }, { status: 400 })
  }

  // ── Mode: download logo image → base64 data URI ─────────────────────────────
  if (mode === 'logo') {
    if (!logoUrl) return NextResponse.json({ error: 'logoUrl é obrigatório' }, { status: 400 })
    try {
      const imgRes = await fetch(logoUrl, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(10_000),
      })
      if (!imgRes.ok) return NextResponse.json({ error: `Imagem retornou ${imgRes.status}` }, { status: 502 })

      const contentType = imgRes.headers.get('content-type') ?? 'image/png'
      // Reject non-image types (e.g. HTML error pages)
      if (!contentType.startsWith('image/')) {
        return NextResponse.json({ error: 'URL não é uma imagem' }, { status: 422 })
      }

      const buf = await imgRes.arrayBuffer()
      const b64 = Buffer.from(buf).toString('base64')
      return NextResponse.json({ dataUri: `data:${contentType};base64,${b64}` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  // ── Mode: scrape website ────────────────────────────────────────────────────
  let siteUrl = rawUrl.trim()
  if (!siteUrl.startsWith('http')) siteUrl = 'https://' + siteUrl

  let origin: string
  try {
    origin = new URL(siteUrl).origin
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }

  try {
    const res = await fetch(siteUrl, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(12_000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Site retornou ${res.status}` }, { status: 502 })
    }

    const html = await res.text()

    const title = extractMeta(html,
      /<title[^>]*>([^<]{1,200})<\/title>/i,
      /<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
    )

    const metaDesc = extractMeta(html,
      /<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
      /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i,
      /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
      /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i,
    )

    const logoSrc = extractLogoUrl(html, origin)
    const bodyText = extractBodyText(html)

    return NextResponse.json({ title, metaDesc, logoUrl: logoSrc, bodyText })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
