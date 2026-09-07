export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getCoverStyle } from '@/lib/coverStyles'

async function mermaidToSvg(diagram: string): Promise<string | null> {
  try {
    const encoded = Buffer.from(diagram, 'utf-8').toString('base64url')
    const res = await fetch(`https://mermaid.ink/svg/${encoded}`, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: 'image/svg+xml' },
    })
    if (!res.ok) return null
    const svg = await res.text()
    return svg.includes('<svg') ? svg : null
  } catch {
    return null
  }
}

function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function fmt(v: number | string): string {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtPct(v: number | string): string {
  return `${Number(v).toFixed(1)}%`
}

// ─── pagination constants (CSS px at 96 dpi) ───────────────────────────────
// Page: 210mm × 297mm → 794 × 1122 px
// Header: padding 28+20 + logo 32 + border = 81 px
// Footer: padding 14+14 + text 13 + border = 42 px
// .pc padding: 36 top + 36 bottom = 72 px
// Usable content area: 1122 - 81 - 42 - 72 = 927 px
const CONTENT_H = 927
const BOM_ROW_H  = 44   // tbody tr (padding 8×2 + name 14 + badge 12 + gap 2)
const TECH_ROW_H = 54   // tbody tr (same + description line)
const S_HDG      = 44   // .section-heading + margin-bottom:20
const TBL_HDR    = 30   // thead tr
const TBL_FTR    = 37   // tfoot tr
const TOTALS_BLK = 200  // .totals-wrap (margin-top:20 + card ~180)

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const [proposal, brands] = await Promise.all([
    prisma.proposal.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        coverProfile: true,
        introProfile: true,
        items: { include: { product: true }, orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.companyProfile.findMany({
      where: { type: 'brand', active: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!proposal) return new Response('Not found', { status: 404 })

  const coverSt      = getCoverStyle(proposal.coverStyle ?? 'teal')
  const showUnit     = proposal.showUnitPrice !== false  // default true

  const subtotal      = proposal.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0)
  const totalDiscount = Number(proposal.totalDiscount)
  const totalPrice    = Number(proposal.totalPrice)
  const margin        = Number(proposal.margin)

  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const validUntil = new Date(Date.now() + proposal.validityDays * 24 * 60 * 60 * 1000)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const companyProfile  = proposal.coverProfile ?? proposal.introProfile
  const logoSrc         = companyProfile?.logoBase64 ?? null
  const companyName     = companyProfile?.name ?? 'Plantec'
  const companyWebsite  = companyProfile?.website ?? 'www.plantec.co'
  const companyEmail    = companyProfile?.email ?? 'comercial@plantec.co'
  const companyPhone    = companyProfile?.phone ?? ''
  const companyAddress  = companyProfile?.address ?? ''
  const companyDescription = proposal.introProfile?.description ?? ''

  const rawDiagram   = proposal.scenarioDiagram ?? ''
  const diagramType  = proposal.diagramType ?? 'mermaid'
  const cleanDiagram = rawDiagram.replace(/^```mermaid\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim()

  // Eraser: use pre-saved imageUrl if available; otherwise call API (with generous timeout)
  let eraserImageUrl: string | null = proposal.eraserImageUrl ?? null
  if (diagramType === 'eraser' && cleanDiagram && !eraserImageUrl) {
    const eraserKey = process.env.ERASER_API_KEY
    if (eraserKey) {
      try {
        const isDsl = /\[icon:/i.test(cleanDiagram) || /^title\s/im.test(cleanDiagram) || /^direction\s/im.test(cleanDiagram)
        const body: Record<string, unknown> = { text: cleanDiagram, theme: 'light', background: true, imageQuality: 3 }
        if (!isDsl) body.diagramType = 'cloud-architecture-diagram'

        const er = await fetch('https://app.eraser.io/api/render/prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${eraserKey}` },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(45000),
        })
        if (er.ok) {
          const ed = await er.json()
          eraserImageUrl = ed.imageUrl ?? null
        } else {
          console.error('[PDF/Eraser] API error', er.status)
        }
      } catch (e) {
        console.error('[PDF/Eraser] fetch failed:', e)
      }
    }
  }

  // Mermaid: convert to SVG via mermaid.ink
  const diagramSvg = (diagramType === 'mermaid' && cleanDiagram) ? await mermaidToSvg(cleanDiagram) : null

  const statusLabel: Record<string, string> = { draft: 'Rascunho', generated: 'Gerada', sent: 'Enviada', approved: 'Aprovada', rejected: 'Recusada' }
  const statusColor: Record<string, string> = { draft: '#6b7280', generated: '#007B77', sent: '#b45309', approved: '#15803d', rejected: '#dc2626' }

  const logoHtml = logoSrc
    ? `<img src="${esc(logoSrc)}" alt="${esc(companyName)}" style="max-height:32px;object-fit:contain">`
    : `<div class="ph-logo-text">${esc(companyName)}</div>`

  const hdr = `<div class="ph">
    ${logoHtml}
    <div class="ph-meta"><strong>${esc(proposal.number)}</strong>${esc(proposal.customer.companyName)}</div>
  </div>`

  const ftr = `<div class="pf">
    <span>${esc(companyName)} · Proposta Comercial</span>
    <div class="footer-bar"></div>
    <span>${esc(proposal.number)} · ${esc(today)}</span>
  </div>`

  // ─── page factory ────────────────────────────────────────────────────────
  function pg(content: string): string {
    return `\n<div class="page">${hdr}<div class="pc">${content}</div>${ftr}</div>`
  }

  // page variant where .pc is a flex column (for full-bleed diagram page)
  function pgFull(content: string): string {
    return `\n<div class="page">${hdr}<div class="pc pc-full">${content}</div>${ftr}</div>`
  }

  // ─── item row generators ─────────────────────────────────────────────────
  type Item = typeof proposal.items[0]

  function productImg(item: Item): string {
    const url = (item.product.attributes as Record<string, unknown> | null)?.image_url as string | null
    if (!url) return ''
    return `<img src="${esc(url)}" onerror="this.style.display='none'"
      style="width:30px;height:30px;object-fit:contain;flex-shrink:0;border-radius:4px;border:1px solid #F1F5F9;background:#F8FAFC" />`
  }

  function nameCell(item: Item, extraText?: string): string {
    const img  = productImg(item)
    const text = `<div style="min-width:0;flex:1;overflow:hidden">
      <span style="font-weight:700;color:#0F172A;font-size:8.5pt;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px">${esc(item.product.name)}</span>
      ${item.product.brand
        ? `<span style="display:block;font-size:7pt;color:#94A3B8;font-weight:500;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(item.product.brand)} · ${esc(item.product.category)}</span>`
        : ''}
      ${extraText ?? ''}
    </div>`
    return `<td style="overflow:hidden"><div style="display:flex;align-items:center;gap:7px">${img}${text}</div></td>`
  }

  function bomRow(item: Item): string {
    const price = Number(item.unitPrice)
    const disc  = Number(item.discount)
    const sub   = price * item.quantity * (1 - disc / 100)
    const cost  = Number(item.cost) * item.quantity
    const marg  = sub > 0 ? ((sub - cost) / sub) * 100 : 0
    const mc    = marg >= 15 ? '#15803d' : marg >= 10 ? '#b45309' : '#dc2626'
    void mc
    if (!showUnit) {
      return `<tr>
        <td class="mono">${esc(item.product.sku)}</td>
        ${nameCell(item)}
        <td class="r" style="font-weight:700">${item.quantity}</td>
        <td class="r" style="font-weight:800;color:#0F172A">${fmt(sub)}</td>
      </tr>`
    }
    return `<tr>
      <td class="mono">${esc(item.product.sku)}</td>
      ${nameCell(item)}
      <td class="r" style="font-weight:700">${item.quantity}</td>
      <td class="r">${fmt(price)}</td>
      <td class="r" style="color:${disc > 0 ? '#dc2626' : '#94A3B8'}">${disc > 0 ? `${disc}%` : '—'}</td>
      <td class="r" style="font-weight:800;color:#0F172A">${fmt(sub)}</td>
    </tr>`
  }

  function techRow(item: Item): string {
    const desc      = item.product.description ?? ''
    const descShort = desc.length > 100 ? desc.slice(0, 100) + '…' : desc
    const notes     = item.technicalNotes ?? (desc ? (desc.length > 180 ? desc.slice(0, 180) + '…' : desc) : '—')
    const extra = descShort
      ? `<div style="font-size:7pt;color:#94A3B8;margin-top:2px;font-weight:500;line-height:1.4">${esc(descShort)}</div>`
      : ''
    const clamp3 = 'display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden'
    return `<tr>
      <td class="mono" style="white-space:nowrap">${esc(item.product.sku)}</td>
      ${nameCell(item, extra)}
      <td class="r" style="font-weight:700;white-space:nowrap">${item.quantity}${item.product.unit ? ` ${esc(item.product.unit)}` : ''}</td>
      <td style="color:#64748B;font-weight:600;white-space:nowrap">${esc(item.product.category)}</td>
      <td style="${clamp3}">${esc(item.role ?? '—')}</td>
      <td style="font-size:7pt;color:#64748B;line-height:1.4;${clamp3}">${esc(notes)}</td>
    </tr>`
  }

  // ─── shared table markup ─────────────────────────────────────────────────
  const bomThead = showUnit
    ? `<thead><tr>
        <th style="width:10%">SKU</th><th style="width:42%">Produto</th>
        <th class="r" style="width:6%">Qtd</th><th class="r" style="width:16%">Preço Unit.</th>
        <th class="r" style="width:8%">Desc.</th><th class="r" style="width:18%">Total</th>
      </tr></thead>`
    : `<thead><tr>
        <th style="width:12%">SKU</th><th style="width:58%">Produto</th>
        <th class="r" style="width:8%">Qtd</th><th class="r" style="width:22%">Total</th>
      </tr></thead>`

  const techThead = `<thead><tr>
    <th style="width:10%">SKU</th><th style="width:32%">Produto</th>
    <th class="r" style="width:7%">Qtd</th><th style="width:12%">Categoria</th>
    <th style="width:18%">Função na Solução</th><th style="width:21%">Descritivo</th>
  </tr></thead>`

  const bomTfoot = showUnit
    ? `<tfoot><tr>
        <td colspan="5" class="r">Total da Proposta</td>
        <td class="r" style="font-size:10.5pt">${fmt(totalPrice)}</td>
      </tr></tfoot>`
    : `<tfoot><tr>
        <td colspan="3" class="r">Total da Proposta</td>
        <td class="r" style="font-size:10.5pt">${fmt(totalPrice)}</td>
      </tr></tfoot>`

  const totalsCard = showUnit
    ? `<div class="totals-wrap"><div class="totals-card">
        <div class="totals-head">Resumo Financeiro</div>
        <div class="totals-body">
          <div class="total-row"><span class="lbl">Subtotal</span><span class="val">${fmt(subtotal)}</span></div>
          ${totalDiscount > 0 ? `<div class="total-row disc"><span class="lbl">Descontos</span><span class="val">– ${fmt(totalDiscount)}</span></div>` : ''}
          <div class="total-row grand"><span class="lbl">Total</span><span class="val">${fmt(totalPrice)}</span></div>
        </div>
      </div></div>`
    : `<div class="totals-wrap"><div class="totals-card">
        <div class="totals-head">Resumo Financeiro</div>
        <div class="totals-body">
          <div class="total-row grand"><span class="lbl">Total</span><span class="val">${fmt(totalPrice)}</span></div>
        </div>
      </div></div>`

  // ─── BOM commercial pages (auto-split) ───────────────────────────────────
  function buildBomPages(): string {
    const items = proposal!.items
    if (!items.length) return ''
    const out: string[] = []
    let rem = [...items]
    let first = true
    let tfootRendered = false

    while (rem.length > 0) {
      const base    = first ? S_HDG : 0
      const capFull = Math.max(1, Math.floor((CONTENT_H - base - TBL_HDR - TBL_FTR - TOTALS_BLK) / BOM_ROW_H))
      const capMore = Math.max(1, Math.floor((CONTENT_H - base - TBL_HDR) / BOM_ROW_H))
      const isLast  = rem.length <= capFull
      const chunk   = isLast ? rem : rem.slice(0, capMore)
      rem           = isLast ? [] : rem.slice(capMore)
      const hdg     = first ? `<div class="section-heading"><h2>BOM Comercial</h2></div>` : ''
      const rows    = chunk.map(bomRow).join('')
      out.push(pg(`${hdg}<table class="data-table">${bomThead}<tbody>${rows}</tbody>${isLast ? bomTfoot : ''}</table>${isLast ? totalsCard : ''}`))
      if (isLast) tfootRendered = true
      first = false
    }

    // Edge case: capFull < N <= capMore — loop exhausted rem without rendering tfoot
    if (!tfootRendered) {
      out.push(pg(`<table class="data-table">${bomTfoot}</table>${totalsCard}`))
    }

    return out.join('')
  }

  // ─── BOM technical pages (auto-split) ────────────────────────────────────
  function buildTechPages(): string {
    const items = proposal!.items
    if (!items.length) return ''
    const out: string[] = []
    let rem = [...items]
    let first = true
    while (rem.length > 0) {
      const base  = first ? S_HDG : 0
      const cap   = Math.max(1, Math.floor((CONTENT_H - base - TBL_HDR) / TECH_ROW_H))
      const chunk = rem.slice(0, cap)
      rem         = rem.slice(cap)
      const hdg   = first ? `<div class="section-heading"><h2>BOM Técnica — Anexo</h2></div>` : ''
      const rows  = chunk.map(techRow).join('')
      out.push(pg(`${hdg}<table class="data-table">${techThead}<tbody>${rows}</tbody></table>`))
      first = false
    }
    return out.join('')
  }

  // ─── brands page ─────────────────────────────────────────────────────────
  function buildBrandsPage(): string {
    if (!brands.length) return ''
    const cards = brands.map(b => {
      const logoHtml = b.logoBase64
        ? `<img src="${esc(b.logoBase64)}" alt="${esc(b.name)}">`
        : `<div class="brand-no-logo">${esc(b.name.slice(0, 3).toUpperCase())}</div>`
      const site = b.website ? b.website.replace(/^https?:\/\/(www\.)?/, '') : ''
      return `<div class="brand-card">
        <div class="brand-card-bar"></div>
        <div class="brand-logo-area">${logoHtml}</div>
        <div class="brand-divider"></div>
        <div class="brand-info">
          <div class="brand-name">${esc(b.name)}</div>
          ${b.description ? `<div class="brand-desc">${esc(b.description)}</div>` : ''}
          ${site ? `<div class="brand-site">${esc(site)}</div>` : ''}
        </div>
      </div>`
    }).join('')
    return pg(`
      <div class="section-heading">
        <h2>Fabricantes Parceiros<span class="brands-count-badge">${brands.length} marcas</span></h2>
      </div>
      <div class="brands-intro">
        Esta proposta foi elaborada com produtos e soluções das seguintes fabricantes parceiras, selecionadas pela excelência técnica, certificações internacionais e suporte ao mercado brasileiro.
      </div>
      <div class="brands-grid">${cards}</div>
    `)
  }

  // ─── mermaid fallback script (only when mermaid type and svg failed) ────────
  const mermaidFallback = (diagramType === 'mermaid' && cleanDiagram && !diagramSvg) ? `
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        if (typeof mermaid === 'undefined') return;
        mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: {
          primaryColor:'#E6F5F4',primaryTextColor:'#002827',primaryBorderColor:'#00928E',
          lineColor:'#007B77',secondaryColor:'#FFF7ED',tertiaryColor:'#EFF6FF',
          fontFamily:'Montserrat,Arial,sans-serif',fontSize:'13px'
        }});
        var els = document.querySelectorAll('pre.mermaid');
        for (var i = 0; i < els.length; i++) {
          (function(el, idx) {
            var code = el.textContent || '';
            if (!code.trim()) return;
            mermaid.render('mmd'+idx, code).then(function(r) {
              var d = document.createElement('div'); d.innerHTML = r.svg;
              el.parentNode.replaceChild(d, el);
            }).catch(function(e) { console.warn('mermaid:', e); });
          })(els[i], i);
        }
      });
    </script>` : ''

  // ─── diagram block ────────────────────────────────────────────────────────
  function buildDiagramInner(): string {
    if (!cleanDiagram) return ''
    if (diagramType === 'eraser') {
      if (eraserImageUrl) {
        return `<div class="mermaid-wrap" style="padding:0;overflow:hidden;border-radius:10px;flex:1;display:flex;align-items:center;justify-content:center">
          <img src="${esc(eraserImageUrl)}" alt="Diagrama de Arquitetura" style="width:100%;height:100%;max-height:780px;object-fit:contain;display:block">
        </div>`
      }
      // fallback: show prompt text if Eraser API failed
      return `<div class="mermaid-wrap" style="padding:16px;background:#f8fafc;color:#64748b;font-size:9pt;white-space:pre-wrap;font-family:monospace">${esc(cleanDiagram)}</div>`
    }
    // mermaid — fill the full page area
    return `<div class="mermaid-wrap" style="flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden">
      ${diagramSvg
        ? `<div style="width:100%;height:100%;max-height:780px;display:flex;align-items:center;justify-content:center">${diagramSvg}</div>`
        : `<pre class="mermaid" style="white-space:pre;font-family:monospace;font-size:9pt;padding:8px">${esc(cleanDiagram)}</pre>`
      }
    </div>`
  }

  // Split scenarioDesc across two pages: narrative intro + bullet sections
  function buildScenarioPages(raw: string): string {
    const SEC = /^(VANTAGENS TÉ?CNICAS?|BENEF[IÍ]CIOS PARA O CLIENTE)[ \t]*:?\s*$/im
    const parts = raw.split(SEC)

    const intro = parts[0]?.trim() ?? ''
    let sectionsHtml = ''
    let i = 1
    while (i < parts.length) {
      const header = parts[i]?.trim()
      const body   = parts[i + 1]?.trim() ?? ''
      if (header) {
        const bullets = body.split(/\n/).map(l => l.trim())
          .filter(l => l.startsWith('•') || l.startsWith('-') || l.startsWith('*'))
          .map(l => l.replace(/^[•\-\*]\s*/, ''))
        if (bullets.length) {
          sectionsHtml += `<div class="scenario-section">
            <div class="scenario-section-title">${esc(header)}</div>
            <div class="scenario-bullets">
              ${bullets.map(b => `<div class="scenario-bullet">${esc(b)}</div>`).join('')}
            </div>
          </div>`
        }
      }
      i += 2
    }

    // Page 1: heading + narrative paragraphs
    let out = pg(`
      <div class="section">
        <div class="section-heading"><h2>Cenário Técnico</h2></div>
        ${intro ? `<div class="scenario-desc scenario-body">${esc(intro)}</div>` : ''}
      </div>
    `)

    // Page 2 (only if bullet sections exist): VANTAGENS + BENEFÍCIOS
    if (sectionsHtml) {
      out += pg(`
        <div class="section">
          <div class="section-heading"><h2>Cenário Técnico — Vantagens e Benefícios</h2></div>
          ${sectionsHtml}
        </div>
      `)
    }

    return out
  }

  function buildDiagramPage(): string {
    if (!cleanDiagram) return ''
    return pgFull(`
      <div class="section-heading"><h2>Diagrama de Topologia</h2></div>
      <div style="flex:1;display:flex;flex-direction:column;min-height:0">
        ${buildDiagramInner()}
        ${diagramType === 'mermaid' ? `<div class="diagram-legend" style="margin-top:12px">
          <div class="legend-item"><div class="legend-dot" style="background:#E6F5F4;border:1.5px solid #00928E"></div>Equipamentos propostos</div>
          <div class="legend-item"><div class="legend-dot" style="background:#FFF7ED;border:1.5px solid #EA580C"></div>Sistemas existentes</div>
          <div class="legend-item"><div class="legend-dot" style="background:white;border:1.5px dashed #94A3B8"></div>Módulos externos</div>
          <div class="legend-item"><div class="legend-dot" style="background:#EFF6FF;border:1.5px solid #3B82F6"></div>Internet / Nuvem</div>
        </div>` : ''}
      </div>
    `)
  }

  // ─── HTML ─────────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Proposta ${esc(proposal.number)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  ${mermaidFallback}
  <style>
    :root{--t900:#002827;--t800:#004341;--t700:#005F5C;--t600:#007B77;--t500:#00928E;--t400:#26A39F;--t300:#4DB4B2;--t100:#B3DFDD;--t50:#E6F5F4;--g50:#F8FAFC;--g100:#F1F5F9;--g200:#E2E8F0;--g400:#94A3B8;--g500:#64748B;--g700:#334155;--g900:#0F172A}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Montserrat',Arial,sans-serif;font-size:10pt;color:var(--g900);background:#f0f4f4;-webkit-print-color-adjust:exact;print-color-adjust:exact}

    /* ── toolbar ─────────────────────────────────────────────── */
    .toolbar{position:fixed;top:0;left:0;right:0;z-index:999;background:var(--t900);display:flex;align-items:center;justify-content:space-between;padding:12px 24px;box-shadow:0 2px 8px rgba(0,0,0,.3)}
    .toolbar-left{display:flex;align-items:center;gap:12px}
    .toolbar-logo{width:32px;height:32px;border-radius:6px;background:var(--t600);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:14px}
    .toolbar-title{color:white;font-size:12px;font-weight:700}
    .toolbar-sub{color:var(--t300);font-size:10px;font-weight:500;margin-top:1px}
    .toolbar-right{display:flex;gap:8px}
    .btn-toolbar{border:none;border-radius:6px;padding:8px 18px;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:700;cursor:pointer;transition:opacity .15s}
    .btn-toolbar:hover{opacity:.85}
    .btn-print{background:var(--t500);color:white}
    .btn-close{background:rgba(255,255,255,.1);color:white}

    /* ── page scaffold ───────────────────────────────────────── */
    .outer{padding:72px 0 40px;display:flex;flex-direction:column;align-items:center;gap:24px}
    .page{background:white;width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column;position:relative;border-radius:4px;box-shadow:0 4px 24px rgba(0,40,39,.12);flex-shrink:0}

    /* ── page header / footer ────────────────────────────────── */
    .ph{padding:28px 56px 20px;border-bottom:1px solid var(--g200);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
    .ph-logo-text{font-size:13pt;font-weight:900;color:var(--t700);letter-spacing:-.5px}
    .ph-meta{text-align:right;font-size:8pt;color:var(--g400);font-weight:600}
    .ph-meta strong{display:block;color:var(--t600);font-size:9pt}
    .pf{padding:14px 56px;border-top:1px solid var(--g200);display:flex;align-items:center;justify-content:space-between;background:var(--g50);flex-shrink:0}
    .pf span{font-size:7.5pt;color:var(--g400);font-weight:600}
    .footer-bar{width:40px;height:3px;background:var(--t500);border-radius:2px}

    /* ── page content area ───────────────────────────────────── */
    .pc{flex:1;padding:36px 56px;overflow:hidden}
    .pc-full{display:flex;flex-direction:column}

    /* ── cover ───────────────────────────────────────────────── */
    .cover{height:100%;display:flex;flex-direction:column;background:linear-gradient(160deg,var(--t900) 0%,var(--t800) 45%,var(--t700) 100%);position:relative;overflow:hidden}
    .cover::before{content:'';position:absolute;top:-160px;right:-160px;width:520px;height:520px;border-radius:50%;background:rgba(255,255,255,.03)}
    .cover::after{content:'';position:absolute;bottom:-80px;left:-80px;width:360px;height:360px;border-radius:50%;background:rgba(0,146,142,.12)}
    .cover-pattern{position:absolute;inset:0;pointer-events:none}
    .cover-top{padding:48px 56px 0;display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0;position:relative;z-index:1}
    .cover-logo-wrap img{max-height:52px;max-width:200px;object-fit:contain;filter:brightness(0) invert(1)}
    .cover-logo-text{font-size:22pt;font-weight:900;color:white;letter-spacing:-1px;line-height:1}
    .cover-logo-sub{font-size:8.5pt;color:var(--t300);font-weight:600;text-transform:uppercase;letter-spacing:2px;margin-top:4px}
    .cover-badge{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:5px 14px;color:var(--t100);font-size:8.5pt;font-weight:700;letter-spacing:.5px;text-transform:uppercase}
    .cover-body{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 56px;position:relative;z-index:1}
    .cover-eyebrow{font-size:8pt;font-weight:800;color:var(--t300);text-transform:uppercase;letter-spacing:3px;margin-bottom:16px;display:flex;align-items:center;gap:10px}
    .cover-eyebrow::before{content:'';display:inline-block;width:28px;height:2px;background:var(--t400);border-radius:2px}
    .cover-title{font-size:28pt;font-weight:900;color:white;line-height:1.15;letter-spacing:-1px;margin-bottom:28px;max-width:520px}
    .cover-divider{width:56px;height:3px;background:var(--t400);border-radius:2px;margin-bottom:24px}
    .cover-client-label{font-size:7.5pt;font-weight:700;color:var(--t300);text-transform:uppercase;letter-spacing:2px;margin-bottom:4px}
    .cover-client-name{font-size:14pt;font-weight:800;color:white}
    .cover-footer{padding:24px 56px;background:rgba(0,0,0,.25);border-top:1px solid rgba(255,255,255,.08);display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;position:relative;z-index:1;flex-shrink:0}
    .cover-footer-item label{display:block;font-size:7pt;font-weight:700;color:var(--t300);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px}
    .cover-footer-item span{font-size:10pt;font-weight:600;color:rgba(255,255,255,.9)}

    /* ── content elements ────────────────────────────────────── */
    .section{margin-bottom:28px}
    .section:last-child{margin-bottom:0}
    .section-heading{display:flex;align-items:center;gap:12px;margin-bottom:20px}
    .section-heading::before{content:'';display:block;width:4px;height:22px;background:var(--t500);border-radius:2px;flex-shrink:0}
    .section-heading h2{font-size:11pt;font-weight:800;color:var(--t800);text-transform:uppercase;letter-spacing:1.5px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .info-card{border:1px solid var(--g200);border-radius:10px;overflow:hidden}
    .info-card-head{background:var(--t50);border-bottom:1px solid var(--t100);padding:10px 16px;font-size:8pt;font-weight:800;color:var(--t700);text-transform:uppercase;letter-spacing:1.5px}
    .info-card-body{padding:14px 16px}
    .info-row{display:flex;gap:8px;margin-bottom:7px;font-size:9pt;line-height:1.4}
    .info-row:last-child{margin-bottom:0}
    .info-label{font-weight:700;color:var(--g500);min-width:72px;flex-shrink:0;font-size:8.5pt}
    .info-val{color:var(--g900);font-weight:500}
    .text-content{font-size:9.5pt;line-height:1.75;color:var(--g700);white-space:pre-line}
    .intro-grid{display:grid;grid-template-columns:200px 1fr;gap:32px;align-items:start}
    .intro-logo-box{border:1px solid var(--g200);border-radius:10px;padding:20px;display:flex;align-items:center;justify-content:center;min-height:100px;background:var(--g50)}
    .intro-logo-box img{max-width:140px;max-height:70px;object-fit:contain}
    table.data-table{width:100%;border-collapse:collapse;font-size:8.5pt}
    table.data-table thead tr{background:var(--t800)}
    table.data-table th{padding:9px 12px;text-align:left;font-size:7.5pt;font-weight:800;color:white;letter-spacing:.8px;text-transform:uppercase}
    table.data-table th.r{text-align:right}
    table.data-table td{padding:8px 12px;border-bottom:1px solid var(--g100);color:var(--g700);vertical-align:top}
    table.data-table td.r{text-align:right}
    table.data-table td.mono{font-family:'Courier New',monospace;font-size:7.5pt;color:var(--g400);font-weight:600}
    table.data-table tbody tr:nth-child(even) td{background:var(--g50)}
    table.data-table tfoot td{padding:10px 12px;font-weight:800;font-size:9pt;color:var(--t800);background:var(--t50);border-top:2px solid var(--t400)}
    table.data-table tfoot td.r{text-align:right}
    .totals-wrap{display:flex;justify-content:flex-end;margin-top:20px}
    .totals-card{width:320px;border:1px solid var(--g200);border-radius:10px;overflow:hidden}
    .totals-head{background:var(--t800);padding:10px 16px;font-size:8pt;font-weight:800;color:white;text-transform:uppercase;letter-spacing:1.5px}
    .totals-body{padding:4px 16px 12px}
    .total-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;font-size:9pt;border-bottom:1px solid var(--g100)}
    .total-row:last-child{border-bottom:none}
    .total-row .lbl{color:var(--g500);font-weight:600}
    .total-row .val{font-weight:700;color:var(--g900)}
    .total-row.disc .val{color:#dc2626}
    .total-row.grand{margin-top:4px;padding-top:10px;border-top:2px solid var(--t400)!important}
    .total-row.grand .lbl{font-size:10pt;font-weight:800;color:var(--t800)}
    .total-row.grand .val{font-size:14pt;font-weight:900;color:var(--t700)}
    .total-row.marg .val{color:#15803d}
    .sig-section{margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:48px}
    .sig-box{border:1px solid var(--g200);border-radius:10px;overflow:hidden}
    .sig-head{padding:8px 16px;background:var(--g50);border-bottom:1px solid var(--g200);font-size:7.5pt;font-weight:800;color:var(--g500);text-transform:uppercase;letter-spacing:1.2px}
    .sig-body{padding:40px 16px 16px}
    .sig-line{border-top:1.5px solid var(--g700);padding-top:8px;text-align:center;font-size:9pt;font-weight:700;color:var(--g700)}
    .sig-sub{text-align:center;font-size:8pt;color:var(--g400);margin-top:4px;font-weight:500}
    .validity-card{border-left:4px solid var(--t500);background:var(--t50);border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;font-size:9.5pt;color:var(--t800);line-height:1.6;font-weight:500}
    .validity-card strong{font-weight:800;color:var(--t700)}
    .scenario-desc{font-size:9.5pt;color:var(--t800);line-height:1.8;font-weight:500}
    .scenario-body{background:var(--t50);border-left:4px solid var(--t400);border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:16px;white-space:pre-line}
    .scenario-section{margin-top:16px;margin-bottom:8px}
    .scenario-section-title{font-size:8.5pt;font-weight:900;color:var(--t700);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;display:flex;align-items:center;gap:8px}
    .scenario-section-title::before{content:'';display:block;width:3px;height:14px;background:var(--t500);border-radius:2px;flex-shrink:0}
    .scenario-bullets{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;padding:10px 14px;background:white;border:1px solid var(--t100);border-radius:8px}
    .scenario-bullet{font-size:8.5pt;color:var(--g700);line-height:1.5;padding:2px 0;display:flex;gap:6px}
    .scenario-bullet::before{content:'•';color:var(--t500);font-weight:900;flex-shrink:0}
    .mermaid-wrap{border:1px solid var(--g200);border-radius:10px;padding:16px;background:white;overflow:hidden}
    .mermaid-wrap svg{max-width:100%;max-height:800px;width:auto;height:auto;display:block;margin:0 auto}
    .diagram-block{margin-top:4px}
    .diagram-legend{display:flex;gap:20px;margin-top:16px;padding:10px 16px;background:var(--g50);border-radius:8px;border:1px solid var(--g100)}
    .legend-item{display:flex;align-items:center;gap:6px;font-size:8pt;color:var(--g500);font-weight:600}
    .legend-dot{width:12px;height:12px;border-radius:3px;flex-shrink:0}

    /* ── brands page ─────────────────────────────────────────── */
    .brands-intro{font-size:8.5pt;color:var(--g600,#475569);line-height:1.75;margin-bottom:20px;padding:13px 18px;background:linear-gradient(135deg,var(--t50) 0%,#f0faf9 100%);border-radius:8px;border:1px solid var(--t100)}
    .brands-count-badge{display:inline-block;background:var(--t500);color:white;font-size:7pt;font-weight:800;letter-spacing:.8px;text-transform:uppercase;padding:3px 10px;border-radius:20px;margin-left:10px;vertical-align:middle}
    .brands-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:0}
    .brand-card{border-radius:11px;overflow:hidden;background:white;border:1px solid var(--g200);box-shadow:0 2px 8px rgba(0,40,39,.07);display:flex;flex-direction:column}
    .brand-card-bar{height:3px;background:linear-gradient(90deg,var(--t600),var(--t300))}
    .brand-logo-area{padding:16px 14px 12px;display:flex;align-items:center;justify-content:center;min-height:72px;background:white;position:relative}
    .brand-logo-area img{max-width:114px;max-height:54px;object-fit:contain}
    .brand-divider{height:1px;background:var(--g100);margin:0}
    .brand-info{padding:10px 12px 12px;flex:1;display:flex;flex-direction:column}
    .brand-name{font-weight:900;font-size:8.5pt;color:var(--t700);margin-bottom:4px;letter-spacing:-.2px}
    .brand-desc{font-size:7pt;color:var(--g500);line-height:1.6;flex:1}
    .brand-site{font-size:6.5pt;color:var(--t500);margin-top:7px;font-weight:700;letter-spacing:.3px;padding-top:6px;border-top:1px solid var(--g100)}
    .brand-no-logo{width:80px;height:46px;border-radius:8px;background:var(--g100);display:flex;align-items:center;justify-content:center;font-size:11pt;font-weight:900;color:var(--g400);letter-spacing:-1px}

    /* ── cover decoration ────────────────────────────────────── */
    .cover-deco{position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden}

    /* ── print ───────────────────────────────────────────────── */
    @page{size:A4 portrait;margin:0}
    @media print{
      .toolbar{display:none!important}
      body{background:white}
      .outer{padding:0;gap:0}
      .page{border-radius:0;box-shadow:none;break-after:page;page-break-after:always}
      .page:last-child{break-after:auto;page-break-after:auto}
    }

    /* ── cover style overrides ───────────────────────────────── */
    .cover{background:${coverSt.bg}!important}
    .cover-pattern{${coverSt.pattern ? `background:${coverSt.pattern}` : 'display:none'}}
    .cover-logo-text{color:${coverSt.text}!important}
    .cover-logo-sub{color:${coverSt.subText}!important}
    .cover-badge{color:${coverSt.accentLight}!important;background:rgba(${coverSt.dark?'255,255,255':'0,0,0'},.1)!important;border-color:rgba(${coverSt.dark?'255,255,255':'0,0,0'},.15)!important}
    .cover-eyebrow{color:${coverSt.accentLight}!important}
    .cover-eyebrow::before{background:${coverSt.accent}!important}
    .cover-title{color:${coverSt.text}!important}
    .cover-divider{background:${coverSt.accent}!important}
    .cover-client-label{color:${coverSt.subText}!important}
    .cover-client-name{color:${coverSt.text}!important}
    .cover-footer{background:${coverSt.footerBg}!important;border-top-color:rgba(${coverSt.dark?'255,255,255':'0,0,0'},.08)!important}
    .cover-footer-item label{color:${coverSt.subText}!important}
    .cover-footer-item span{color:${coverSt.text}!important;opacity:0.9}
  </style>
</head>
<body>

<div class="toolbar">
  <div class="toolbar-left">
    ${logoSrc ? `<img src="${esc(logoSrc)}" alt="" style="height:28px;object-fit:contain;filter:brightness(0) invert(1)">` : `<div class="toolbar-logo">P</div>`}
    <div>
      <div class="toolbar-title">${esc(companyName)}</div>
      <div class="toolbar-sub">${esc(proposal.number)} · ${esc(proposal.customer.companyName)}</div>
    </div>
  </div>
  <div class="toolbar-right">
    <a id="btn-download" href="${process.env.NEXT_BASE_PATH ?? ''}/proposals/${esc(params.id)}/download" class="btn-toolbar btn-print" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px">⬇ Baixar PDF</a>
    <button id="btn-print" class="btn-toolbar" style="background:rgba(255,255,255,.12);color:white">Imprimir</button>
    <button id="btn-close" class="btn-toolbar btn-close">✕ Fechar</button>
  </div>
</div>

<div class="outer">

  <!-- CAPA -->
  <div class="page">
    <div class="cover">
      <div class="cover-pattern"></div>
      ${coverSt.decorationSvg ? `<div class="cover-deco">${coverSt.decorationSvg}</div>` : ''}
      <div class="cover-top">
        <div>
          ${logoSrc
            ? `<div class="cover-logo-wrap"><img src="${esc(logoSrc)}" alt="${esc(companyName)}"></div>`
            : `<div class="cover-logo-text">${esc(companyName)}</div><div class="cover-logo-sub">Distribuidora de Tecnologia</div>`
          }
        </div>
        <div class="cover-badge">Proposta Comercial</div>
      </div>
      <div class="cover-body">
        <div class="cover-eyebrow">${esc(proposal.vertical)}</div>
        <div class="cover-title">${esc(proposal.title)}</div>
        <div class="cover-divider"></div>
        <div class="cover-client-label">Elaborada para</div>
        <div class="cover-client-name">${esc(proposal.customer.companyName)}</div>
      </div>
      <div class="cover-footer">
        <div class="cover-footer-item"><label>Nº da Proposta</label><span>${esc(proposal.number)}</span></div>
        <div class="cover-footer-item"><label>Data de Emissão</label><span>${esc(today)}</span></div>
        <div class="cover-footer-item"><label>Validade</label><span>Até ${esc(validUntil)}</span></div>
      </div>
    </div>
  </div>

  <!-- DADOS DA PROPOSTA -->
  ${pg(`
    <div class="section">
      <div class="section-heading"><h2>Dados da Proposta</h2></div>
      <div class="info-grid">
        <div class="info-card">
          <div class="info-card-head">Fornecedor</div>
          <div class="info-card-body">
            <div class="info-row"><span class="info-label">Empresa</span><span class="info-val">${esc(companyName)}</span></div>
            ${companyWebsite ? `<div class="info-row"><span class="info-label">Site</span><span class="info-val">${esc(companyWebsite)}</span></div>` : ''}
            ${companyEmail ? `<div class="info-row"><span class="info-label">E-mail</span><span class="info-val">${esc(companyEmail)}</span></div>` : ''}
            ${companyPhone ? `<div class="info-row"><span class="info-label">Telefone</span><span class="info-val">${esc(companyPhone)}</span></div>` : ''}
            ${companyAddress ? `<div class="info-row"><span class="info-label">Endereço</span><span class="info-val">${esc(companyAddress)}</span></div>` : ''}
          </div>
        </div>
        <div class="info-card">
          <div class="info-card-head">Cliente</div>
          <div class="info-card-body">
            <div class="info-row"><span class="info-label">Razão Social</span><span class="info-val">${esc(proposal.customer.companyName)}</span></div>
            ${proposal.customer.tradeName ? `<div class="info-row"><span class="info-label">Fantasia</span><span class="info-val">${esc(proposal.customer.tradeName)}</span></div>` : ''}
            ${proposal.customer.cnpj ? `<div class="info-row"><span class="info-label">CNPJ</span><span class="info-val">${esc(proposal.customer.cnpj)}</span></div>` : ''}
            ${proposal.customer.contactName ? `<div class="info-row"><span class="info-label">Contato</span><span class="info-val">${esc(proposal.customer.contactName)}</span></div>` : ''}
            ${proposal.customer.email ? `<div class="info-row"><span class="info-label">E-mail</span><span class="info-val">${esc(proposal.customer.email)}</span></div>` : ''}
            ${proposal.customer.city ? `<div class="info-row"><span class="info-label">Cidade</span><span class="info-val">${esc(proposal.customer.city)}${proposal.customer.state ? '/' + esc(proposal.customer.state) : ''}</span></div>` : ''}
          </div>
        </div>
      </div>
    </div>
  `)}

  <!-- RESUMO EXECUTIVO (página própria se presente) -->
  ${proposal.executiveSummary ? pg(`
    <div class="section">
      <div class="section-heading"><h2>Resumo Executivo</h2></div>
      <div class="text-content">${esc(proposal.executiveSummary)}</div>
    </div>
  `) : ''}

  <!-- ESCOPO (página própria se presente) -->
  ${proposal.scope ? pg(`
    <div class="section">
      <div class="section-heading"><h2>Escopo do Projeto</h2></div>
      <div class="text-content">${esc(proposal.scope)}</div>
    </div>
  `) : ''}

  <!-- SOBRE A EMPRESA (página própria se presente) -->
  ${companyDescription ? pg(`
    <div class="section">
      <div class="section-heading"><h2>Sobre a ${esc(companyName)}</h2></div>
      ${logoSrc ? `<div class="intro-grid"><div class="intro-logo-box"><img src="${esc(logoSrc)}" alt="${esc(companyName)}"></div><div class="text-content">${esc(companyDescription)}</div></div>` : `<div class="text-content">${esc(companyDescription)}</div>`}
    </div>
  `) : ''}

  <!-- FABRICANTES PARCEIROS -->
  ${buildBrandsPage()}

  <!-- CENÁRIO TÉCNICO (descrição) — split across pages as needed -->
  ${proposal.scenarioDesc ? buildScenarioPages(proposal.scenarioDesc) : ''}

  <!-- DIAGRAMA DE TOPOLOGIA (página exclusiva, tamanho máximo) -->
  ${buildDiagramPage()}

  <!-- BOM COMERCIAL (auto-paginado) -->
  ${buildBomPages()}

  <!-- BOM TÉCNICA (auto-paginado) -->
  ${buildTechPages()}

  <!-- CONDIÇÕES & ACEITE -->
  ${pg(`
    ${proposal.commercialTerms ? `<div class="section"><div class="section-heading"><h2>Condições Comerciais</h2></div><div class="text-content">${esc(proposal.commercialTerms)}</div></div>` : ''}
    <div class="section">
      <div class="section-heading"><h2>Validade e Aceite</h2></div>
      <div class="validity-card">Esta proposta é válida por <strong>${proposal.validityDays} dias</strong> a partir de ${esc(today)}, ou seja, até <strong>${esc(validUntil)}</strong>. Após este prazo, os valores e condições aqui descritos estão sujeitos a revisão.</div>
      <div class="sig-section">
        <div class="sig-box">
          <div class="sig-head">Fornecedor</div>
          <div class="sig-body"><div class="sig-line">${esc(companyName)}</div><div class="sig-sub">Responsável comercial</div></div>
        </div>
        <div class="sig-box">
          <div class="sig-head">Cliente</div>
          <div class="sig-body"><div class="sig-line">${esc(proposal.customer.companyName)}</div><div class="sig-sub">${esc(proposal.customer.contactName ?? 'Representante autorizado')}</div></div>
        </div>
      </div>
    </div>
    <div style="margin-top:32px;text-align:center">
      <span style="display:inline-block;padding:4px 16px;border-radius:20px;font-size:9pt;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:${statusColor[proposal.status] ?? '#6b7280'};border:1.5px solid ${statusColor[proposal.status] ?? '#6b7280'}">
        ${statusLabel[proposal.status] ?? esc(proposal.status)}
      </span>
    </div>
  `)}

</div>

<script>
  document.getElementById('btn-print').addEventListener('click', function() { window.print(); });
  document.getElementById('btn-close').addEventListener('click', function() { window.close(); });
</script>
</body>
</html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
