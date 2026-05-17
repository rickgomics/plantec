export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getCoverStyle } from '@/lib/coverStyles'

async function mermaidToSvg(diagram: string): Promise<string | null> {
  try {
    const encoded = Buffer.from(diagram, 'utf-8').toString('base64url')
    const res = await fetch(`https://mermaid.ink/svg/${encoded}`, {
      signal: AbortSignal.timeout(8000),
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

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      coverProfile: true,
      introProfile: true,
      items: { include: { product: true }, orderBy: { createdAt: 'asc' } },
    },
  })

  if (!proposal) return new Response('Not found', { status: 404 })

  const coverSt = getCoverStyle(proposal.coverStyle ?? 'teal')

  const subtotal = proposal.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0)
  const totalDiscount = Number(proposal.totalDiscount)
  const totalPrice = Number(proposal.totalPrice)
  const margin = Number(proposal.margin)

  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const validUntil = new Date(Date.now() + proposal.validityDays * 24 * 60 * 60 * 1000)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const companyProfile = proposal.coverProfile ?? proposal.introProfile
  const logoSrc = companyProfile?.logoBase64 ?? null
  const companyName = companyProfile?.name ?? 'Plantec'
  const companyWebsite = companyProfile?.website ?? 'www.plantec.co'
  const companyEmail = companyProfile?.email ?? 'comercial@plantec.co'
  const companyPhone = companyProfile?.phone ?? ''
  const companyAddress = companyProfile?.address ?? ''
  const companyDescription = proposal.introProfile?.description ?? ''

  const rawDiagram = proposal.scenarioDiagram ?? ''
  const cleanDiagram = rawDiagram.replace(/^```mermaid\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim()
  const diagramSvg = cleanDiagram ? await mermaidToSvg(cleanDiagram) : null

  const statusLabel: Record<string, string> = { draft: 'Rascunho', generated: 'Gerada', sent: 'Enviada', approved: 'Aprovada', rejected: 'Recusada' }
  const statusColor: Record<string, string> = { draft: '#6b7280', generated: '#007B77', sent: '#b45309', approved: '#15803d', rejected: '#dc2626' }

  const logoHtml = logoSrc
    ? `<img src="${esc(logoSrc)}" alt="${esc(companyName)}" style="max-height:32px;object-fit:contain">`
    : `<div class="page-header-logo-text">${esc(companyName)}</div>`

  const pageHeader = `
    <div class="page-header">
      ${logoHtml}
      <div class="page-header-meta"><strong>${esc(proposal.number)}</strong>${esc(proposal.customer.companyName)}</div>
    </div>`

  const pageFooter = `
    <div class="page-footer">
      <span>${esc(companyName)} · Proposta Comercial</span>
      <div class="footer-bar"></div>
      <span>${esc(proposal.number)} · ${esc(today)}</span>
    </div>`

  const bomRows = proposal.items.map(item => {
    const price = Number(item.unitPrice)
    const disc = Number(item.discount)
    const sub = price * item.quantity * (1 - disc / 100)
    const cost = Number(item.cost) * item.quantity
    const marg = sub > 0 ? ((sub - cost) / sub) * 100 : 0
    const margColor = marg >= 15 ? '#15803d' : marg >= 10 ? '#b45309' : '#dc2626'
    return `<tr>
      <td class="mono">${esc(item.product.sku)}</td>
      <td><span style="font-weight:700;color:#0F172A">${esc(item.product.name)}</span>${item.product.brand ? `<span style="display:block;font-size:7.5pt;color:#94A3B8;font-weight:500;margin-top:1px">${esc(item.product.brand)} · ${esc(item.product.category)}</span>` : ''}</td>
      <td class="r" style="font-weight:700">${item.quantity}</td>
      <td class="r">${fmt(price)}</td>
      <td class="r" style="color:${disc > 0 ? '#dc2626' : '#94A3B8'}">${disc > 0 ? `${disc}%` : '—'}</td>
      <td class="r" style="font-weight:800;color:#0F172A">${fmt(sub)}</td>
      <td class="r" style="font-weight:700;color:${margColor}">${fmtPct(marg)}</td>
    </tr>`
  }).join('')

  const techRows = proposal.items.map(item => {
    const desc = item.product.description ?? ''
    const descShort = desc.length > 100 ? desc.slice(0, 100) + '…' : desc
    const notes = item.technicalNotes ?? (desc ? (desc.length > 180 ? desc.slice(0, 180) + '…' : desc) : '—')
    return `<tr>
      <td class="mono">${esc(item.product.sku)}</td>
      <td><span style="font-weight:700;color:#0F172A">${esc(item.product.name)}</span>${descShort ? `<div style="font-size:7.5pt;color:#94A3B8;margin-top:2px;font-weight:500;line-height:1.4">${esc(descShort)}</div>` : ''}</td>
      <td class="r" style="font-weight:700">${item.quantity}${item.product.unit ? ` ${esc(item.product.unit)}` : ''}</td>
      <td style="color:#64748B;font-weight:600">${esc(item.product.category)}</td>
      <td>${esc(item.role ?? '—')}</td>
      <td style="font-size:7pt;color:#64748B;line-height:1.4">${esc(notes)}</td>
    </tr>`
  }).join('')

  const diagramSection = cleanDiagram ? `
    <div style="margin-bottom:12px;font-size:8.5pt;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:1px">Diagrama de Topologia</div>
    <div class="mermaid-wrap">
      ${diagramSvg
        ? diagramSvg
        : `<pre class="mermaid" style="white-space:pre;font-family:monospace;font-size:9pt;padding:8px">${esc(cleanDiagram)}</pre>`
      }
    </div>
    <div class="diagram-legend">
      <div class="legend-item"><div class="legend-dot" style="background:#E6F5F4;border:1.5px solid #00928E"></div>Equipamentos propostos</div>
      <div class="legend-item"><div class="legend-dot" style="background:#FFF7ED;border:1.5px solid #EA580C"></div>Sistemas existentes</div>
      <div class="legend-item"><div class="legend-dot" style="background:white;border:1.5px dashed #94A3B8"></div>Módulos externos</div>
      <div class="legend-item"><div class="legend-dot" style="background:#EFF6FF;border:1.5px solid #3B82F6"></div>Internet / Nuvem</div>
    </div>` : ''

  const mermaidFallback = (cleanDiagram && !diagramSvg) ? `
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

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Proposta ${esc(proposal.number)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  ${mermaidFallback}
  <style>
    :root{--t900:#002827;--t800:#004341;--t700:#005F5C;--t600:#007B77;--t500:#00928E;--t400:#26A39F;--t300:#4DB4B2;--t100:#B3DFDD;--t50:#E6F5F4;--g50:#F8FAFC;--g100:#F1F5F9;--g200:#E2E8F0;--g400:#94A3B8;--g500:#64748B;--g700:#334155;--g900:#0F172A}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Montserrat',Arial,sans-serif;font-size:10pt;color:var(--g900);background:#f0f4f4;-webkit-print-color-adjust:exact;print-color-adjust:exact}
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
    .outer{padding:72px 24px 40px;max-width:900px;margin:0 auto}
    .pdf-page{background:white;border-radius:4px;box-shadow:0 4px 24px rgba(0,40,39,.12);margin-bottom:24px;overflow:hidden}
    .cover{min-height:1056px;display:flex;flex-direction:column;background:linear-gradient(160deg,var(--t900) 0%,var(--t800) 45%,var(--t700) 100%);position:relative;overflow:hidden}
    .cover::before{content:'';position:absolute;top:-160px;right:-160px;width:520px;height:520px;border-radius:50%;background:rgba(255,255,255,.03)}
    .cover::after{content:'';position:absolute;bottom:-80px;left:-80px;width:360px;height:360px;border-radius:50%;background:rgba(0,146,142,.12)}
    .cover-top{padding:48px 56px 0;display:flex;justify-content:space-between;align-items:flex-start}
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
    .cover-footer{padding:24px 56px;background:rgba(0,0,0,.25);border-top:1px solid rgba(255,255,255,.08);display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;position:relative;z-index:1}
    .cover-footer-item label{display:block;font-size:7pt;font-weight:700;color:var(--t300);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px}
    .cover-footer-item span{font-size:10pt;font-weight:600;color:rgba(255,255,255,.9)}
    .inner-page{min-height:1056px;display:flex;flex-direction:column}
    .page-header{padding:28px 56px 20px;border-bottom:1px solid var(--g200);display:flex;align-items:center;justify-content:space-between}
    .page-header-logo-text{font-size:13pt;font-weight:900;color:var(--t700);letter-spacing:-.5px}
    .page-header-meta{text-align:right;font-size:8pt;color:var(--g400);font-weight:600}
    .page-header-meta strong{display:block;color:var(--t600);font-size:9pt}
    .page-content{flex:1;padding:36px 56px}
    .page-footer{padding:14px 56px;border-top:1px solid var(--g200);display:flex;align-items:center;justify-content:space-between;background:var(--g50)}
    .page-footer span{font-size:7.5pt;color:var(--g400);font-weight:600}
    .footer-bar{width:40px;height:3px;background:var(--t500);border-radius:2px}
    .section{margin-bottom:36px}
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
    .scenario-desc{background:var(--t50);border-left:4px solid var(--t400);border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;font-size:9.5pt;color:var(--t800);line-height:1.75;font-weight:500;white-space:pre-line}
    .mermaid-wrap{border:1px solid var(--g200);border-radius:10px;padding:24px;background:white;overflow:hidden;min-height:80px}
    .mermaid-wrap svg{max-width:100%;height:auto;display:block;margin:0 auto}
    .diagram-legend{display:flex;gap:20px;margin-top:16px;padding:10px 16px;background:var(--g50);border-radius:8px;border:1px solid var(--g100)}
    .legend-item{display:flex;align-items:center;gap:6px;font-size:8pt;color:var(--g500);font-weight:600}
    .legend-dot{width:12px;height:12px;border-radius:3px;flex-shrink:0}
    @media print{.toolbar{display:none!important}body{background:white}.outer{padding:0;max-width:none}.pdf-page{box-shadow:none;border-radius:0;margin-bottom:0;page-break-after:always}.pdf-page:last-child{page-break-after:auto}.inner-page{min-height:100vh}}
    /* Cover style overrides */
    .cover{background:${coverSt.bg}!important}
    .cover-pattern{position:absolute;inset:0;pointer-events:none;${coverSt.pattern ? `background:${coverSt.pattern}` : 'display:none'}}
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
    <button id="btn-print" class="btn-toolbar btn-print">Imprimir / PDF</button>
    <button id="btn-close" class="btn-toolbar btn-close">✕ Fechar</button>
  </div>
</div>

<div class="outer">

  <!-- CAPA -->
  <div class="pdf-page">
    <div class="cover">
      <div class="cover-pattern"></div>
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

  <!-- DADOS & RESUMO -->
  <div class="pdf-page">
    <div class="inner-page">
      ${pageHeader}
      <div class="page-content">
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
        ${proposal.executiveSummary ? `<div class="section"><div class="section-heading"><h2>Resumo Executivo</h2></div><div class="text-content">${esc(proposal.executiveSummary)}</div></div>` : ''}
        ${proposal.scope ? `<div class="section"><div class="section-heading"><h2>Escopo do Projeto</h2></div><div class="text-content">${esc(proposal.scope)}</div></div>` : ''}
        ${companyDescription ? `<div class="section"><div class="section-heading"><h2>Sobre a ${esc(companyName)}</h2></div>${logoSrc ? `<div class="intro-grid"><div class="intro-logo-box"><img src="${esc(logoSrc)}" alt="${esc(companyName)}"></div><div class="text-content">${esc(companyDescription)}</div></div>` : `<div class="text-content">${esc(companyDescription)}</div>`}</div>` : ''}
      </div>
      ${pageFooter}
    </div>
  </div>

  <!-- CENÁRIO TÉCNICO -->
  ${(proposal.scenarioDesc || cleanDiagram) ? `
  <div class="pdf-page">
    <div class="inner-page">
      ${pageHeader}
      <div class="page-content">
        <div class="section">
          <div class="section-heading"><h2>Cenário Técnico</h2></div>
          ${proposal.scenarioDesc ? `<div class="scenario-desc">${esc(proposal.scenarioDesc)}</div>` : ''}
          ${diagramSection}
        </div>
      </div>
      ${pageFooter}
    </div>
  </div>` : ''}

  <!-- BOM COMERCIAL -->
  <div class="pdf-page">
    <div class="inner-page">
      ${pageHeader}
      <div class="page-content">
        <div class="section">
          <div class="section-heading"><h2>BOM Comercial</h2></div>
          <table class="data-table">
            <thead><tr>
              <th style="width:9%">SKU</th><th style="width:38%">Produto</th>
              <th class="r" style="width:6%">Qtd</th><th class="r" style="width:14%">Preço Unit.</th>
              <th class="r" style="width:8%">Desc.</th><th class="r" style="width:14%">Subtotal</th>
              <th class="r" style="width:8%">Margem</th>
            </tr></thead>
            <tbody>${bomRows}</tbody>
            <tfoot><tr>
              <td colspan="5" class="r">Total da Proposta</td>
              <td class="r" style="font-size:10.5pt">${fmt(totalPrice)}</td>
              <td class="r" style="color:${margin >= 15 ? '#15803d' : margin >= 10 ? '#b45309' : '#dc2626'}">${fmtPct(margin)}</td>
            </tr></tfoot>
          </table>
          <div class="totals-wrap">
            <div class="totals-card">
              <div class="totals-head">Resumo Financeiro</div>
              <div class="totals-body">
                <div class="total-row"><span class="lbl">Subtotal</span><span class="val">${fmt(subtotal)}</span></div>
                ${totalDiscount > 0 ? `<div class="total-row disc"><span class="lbl">Descontos</span><span class="val">– ${fmt(totalDiscount)}</span></div>` : ''}
                <div class="total-row grand"><span class="lbl">Total</span><span class="val">${fmt(totalPrice)}</span></div>
                <div class="total-row marg"><span class="lbl">Margem estimada</span><span class="val">${fmtPct(margin)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${pageFooter}
    </div>
  </div>

  <!-- BOM TÉCNICA -->
  <div class="pdf-page">
    <div class="inner-page">
      ${pageHeader}
      <div class="page-content">
        <div class="section">
          <div class="section-heading"><h2>BOM Técnica — Anexo</h2></div>
          <table class="data-table">
            <thead><tr>
              <th style="width:10%">SKU</th><th style="width:32%">Produto</th>
              <th class="r" style="width:7%">Qtd</th><th style="width:12%">Categoria</th>
              <th style="width:18%">Função na Solução</th><th style="width:21%">Descritivo</th>
            </tr></thead>
            <tbody>${techRows}</tbody>
          </table>
        </div>
      </div>
      ${pageFooter}
    </div>
  </div>

  <!-- CONDIÇÕES & ACEITE -->
  <div class="pdf-page">
    <div class="inner-page">
      ${pageHeader}
      <div class="page-content">
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
        <div style="margin-top:40px;text-align:center">
          <span style="display:inline-block;padding:4px 16px;border-radius:20px;font-size:9pt;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:${statusColor[proposal.status] ?? '#6b7280'};border:1.5px solid ${statusColor[proposal.status] ?? '#6b7280'};background:transparent">
            ${statusLabel[proposal.status] ?? esc(proposal.status)}
          </span>
        </div>
      </div>
      ${pageFooter}
    </div>
  </div>

</div>

<script>
  document.getElementById('btn-print').addEventListener('click', function() { window.print(); });
  document.getElementById('btn-close').addEventListener('click', function() { window.close(); });
</script>
</body>
</html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
