import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function ProposalPDFPage({ params }: { params: { id: string } }) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      coverProfile: true,
      introProfile: true,
      items: {
        include: { product: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!proposal) notFound()

  const fmt = (v: number | string | { toString(): string }) =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const fmtPct = (v: number | string) => `${Number(v).toFixed(1)}%`

  const subtotal = proposal.items.reduce(
    (s, i) => s + Number(i.unitPrice) * i.quantity, 0
  )
  const totalDiscount = Number(proposal.totalDiscount)
  const totalPrice = Number(proposal.totalPrice)
  const margin = Number(proposal.margin)

  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const validUntil = new Date(
    Date.now() + proposal.validityDays * 24 * 60 * 60 * 1000
  ).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const companyProfile = proposal.coverProfile ?? proposal.introProfile
  const logoSrc = companyProfile?.logoBase64 ?? null
  const companyName = companyProfile?.name ?? 'Plantec'
  const companyWebsite = companyProfile?.website ?? 'www.plantec.co'
  const companyEmail = companyProfile?.email ?? 'comercial@plantec.co'
  const companyPhone = companyProfile?.phone ?? ''
  const companyAddress = companyProfile?.address ?? ''
  const companyDescription = proposal.introProfile?.description ?? ''

  const statusLabel: Record<string, string> = {
    draft: 'Rascunho', generated: 'Gerada', sent: 'Enviada',
    approved: 'Aprovada', rejected: 'Recusada',
  }
  const statusColor: Record<string, string> = {
    draft: '#6b7280', generated: '#007B77', sent: '#b45309',
    approved: '#15803d', rejected: '#dc2626',
  }

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Proposta {proposal.number}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          :root {
            --teal-900: #002827;
            --teal-800: #004341;
            --teal-700: #005F5C;
            --teal-600: #007B77;
            --teal-500: #00928E;
            --teal-400: #26A39F;
            --teal-300: #4DB4B2;
            --teal-100: #B3DFDD;
            --teal-50:  #E6F5F4;
            --gray-50:  #F8FAFC;
            --gray-100: #F1F5F9;
            --gray-200: #E2E8F0;
            --gray-400: #94A3B8;
            --gray-500: #64748B;
            --gray-700: #334155;
            --gray-900: #0F172A;
          }

          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 10pt;
            color: var(--gray-900);
            background: #f0f4f4;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* ─── TOOLBAR ─────────────────────────────────────── */
          .toolbar {
            position: fixed; top: 0; left: 0; right: 0; z-index: 999;
            background: var(--teal-900);
            display: flex; align-items: center; justify-content: space-between;
            padding: 12px 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,.3);
          }
          .toolbar-left { display: flex; align-items: center; gap: 12px; }
          .toolbar-logo {
            width: 32px; height: 32px; border-radius: 6px;
            background: var(--teal-600);
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 900; font-size: 14px;
          }
          .toolbar-title { color: white; font-size: 12px; font-weight: 700; }
          .toolbar-sub { color: var(--teal-300); font-size: 10px; font-weight: 500; margin-top: 1px; }
          .toolbar-right { display: flex; gap: 8px; }
          .btn-toolbar {
            border: none; border-radius: 6px; padding: 8px 18px;
            font-family: 'Montserrat', sans-serif;
            font-size: 11px; font-weight: 700;
            cursor: pointer; letter-spacing: .3px;
            transition: opacity .15s;
          }
          .btn-toolbar:hover { opacity: .85; }
          .btn-print { background: var(--teal-500); color: white; }
          .btn-close  { background: rgba(255,255,255,.1); color: white; }

          /* ─── OUTER WRAPPER ───────────────────────────────── */
          .outer {
            padding: 72px 24px 40px;
            max-width: 900px;
            margin: 0 auto;
          }

          /* ─── PAGES ───────────────────────────────────────── */
          .pdf-page {
            background: white;
            border-radius: 4px;
            box-shadow: 0 4px 24px rgba(0,40,39,.12);
            margin-bottom: 24px;
            overflow: hidden;
            position: relative;
          }

          /* ─── COVER PAGE ──────────────────────────────────── */
          .cover {
            min-height: 1056px;
            display: flex;
            flex-direction: column;
            background: linear-gradient(160deg, var(--teal-900) 0%, var(--teal-800) 45%, var(--teal-700) 100%);
            position: relative;
            overflow: hidden;
          }
          .cover::before {
            content: '';
            position: absolute;
            top: -160px; right: -160px;
            width: 520px; height: 520px;
            border-radius: 50%;
            background: rgba(255,255,255,.03);
          }
          .cover::after {
            content: '';
            position: absolute;
            bottom: -80px; left: -80px;
            width: 360px; height: 360px;
            border-radius: 50%;
            background: rgba(0,146,142,.12);
          }

          .cover-top {
            padding: 48px 56px 0;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .cover-logo-wrap img {
            max-height: 52px;
            max-width: 200px;
            object-fit: contain;
            filter: brightness(0) invert(1);
          }
          .cover-logo-text {
            font-size: 22pt;
            font-weight: 900;
            color: white;
            letter-spacing: -1px;
            line-height: 1;
          }
          .cover-logo-sub {
            font-size: 8.5pt;
            color: var(--teal-300);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-top: 4px;
          }
          .cover-badge {
            background: rgba(255,255,255,.1);
            border: 1px solid rgba(255,255,255,.15);
            border-radius: 20px;
            padding: 5px 14px;
            color: var(--teal-100);
            font-size: 8.5pt;
            font-weight: 700;
            letter-spacing: .5px;
            text-transform: uppercase;
          }

          .cover-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 0 56px;
            position: relative;
            z-index: 1;
          }
          .cover-eyebrow {
            font-size: 8pt;
            font-weight: 800;
            color: var(--teal-300);
            text-transform: uppercase;
            letter-spacing: 3px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .cover-eyebrow::before {
            content: '';
            display: inline-block;
            width: 28px;
            height: 2px;
            background: var(--teal-400);
            border-radius: 2px;
          }
          .cover-title {
            font-size: 28pt;
            font-weight: 900;
            color: white;
            line-height: 1.15;
            letter-spacing: -1px;
            margin-bottom: 28px;
            max-width: 520px;
          }
          .cover-divider {
            width: 56px;
            height: 3px;
            background: var(--teal-400);
            border-radius: 2px;
            margin-bottom: 24px;
          }
          .cover-client-label {
            font-size: 7.5pt;
            font-weight: 700;
            color: var(--teal-300);
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 4px;
          }
          .cover-client-name {
            font-size: 14pt;
            font-weight: 800;
            color: white;
          }

          .cover-footer {
            padding: 24px 56px;
            background: rgba(0,0,0,.25);
            border-top: 1px solid rgba(255,255,255,.08);
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 24px;
            position: relative;
            z-index: 1;
          }
          .cover-footer-item label {
            display: block;
            font-size: 7pt;
            font-weight: 700;
            color: var(--teal-300);
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 3px;
          }
          .cover-footer-item span {
            font-size: 10pt;
            font-weight: 600;
            color: rgba(255,255,255,.9);
          }

          /* ─── INNER PAGES ─────────────────────────────────── */
          .inner-page {
            min-height: 1056px;
            display: flex;
            flex-direction: column;
          }

          .page-header {
            padding: 28px 56px 20px;
            border-bottom: 1px solid var(--gray-200);
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .page-header-logo img {
            max-height: 32px;
            object-fit: contain;
          }
          .page-header-logo-text {
            font-size: 13pt;
            font-weight: 900;
            color: var(--teal-700);
            letter-spacing: -0.5px;
          }
          .page-header-meta {
            text-align: right;
            font-size: 8pt;
            color: var(--gray-400);
            font-weight: 600;
          }
          .page-header-meta strong {
            display: block;
            color: var(--teal-600);
            font-size: 9pt;
          }

          .page-content {
            flex: 1;
            padding: 36px 56px;
          }

          .page-footer {
            padding: 14px 56px;
            border-top: 1px solid var(--gray-200);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--gray-50);
          }
          .page-footer span {
            font-size: 7.5pt;
            color: var(--gray-400);
            font-weight: 600;
          }
          .footer-bar {
            width: 40px;
            height: 3px;
            background: var(--teal-500);
            border-radius: 2px;
          }

          /* ─── SECTIONS ────────────────────────────────────── */
          .section { margin-bottom: 36px; }

          .section-heading {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
          }
          .section-heading::before {
            content: '';
            display: block;
            width: 4px;
            height: 22px;
            background: var(--teal-500);
            border-radius: 2px;
            flex-shrink: 0;
          }
          .section-heading h2 {
            font-size: 11pt;
            font-weight: 800;
            color: var(--teal-800);
            text-transform: uppercase;
            letter-spacing: 1.5px;
          }

          /* ─── INFO GRID ───────────────────────────────────── */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .info-card {
            border: 1px solid var(--gray-200);
            border-radius: 10px;
            overflow: hidden;
          }
          .info-card-head {
            background: var(--teal-50);
            border-bottom: 1px solid var(--teal-100);
            padding: 10px 16px;
            font-size: 8pt;
            font-weight: 800;
            color: var(--teal-700);
            text-transform: uppercase;
            letter-spacing: 1.5px;
          }
          .info-card-body { padding: 14px 16px; }
          .info-row {
            display: flex;
            gap: 8px;
            margin-bottom: 7px;
            font-size: 9pt;
            line-height: 1.4;
          }
          .info-row:last-child { margin-bottom: 0; }
          .info-label {
            font-weight: 700;
            color: var(--gray-500);
            min-width: 72px;
            flex-shrink: 0;
            font-size: 8.5pt;
          }
          .info-val { color: var(--gray-900); font-weight: 500; }

          /* ─── TEXT CONTENT ────────────────────────────────── */
          .text-content {
            font-size: 9.5pt;
            line-height: 1.75;
            color: var(--gray-700);
            white-space: pre-line;
          }

          /* ─── INTRO COMPANY ───────────────────────────────── */
          .intro-grid {
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: 32px;
            align-items: start;
          }
          .intro-logo-box {
            border: 1px solid var(--gray-200);
            border-radius: 10px;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100px;
            background: var(--gray-50);
          }
          .intro-logo-box img { max-width: 140px; max-height: 70px; object-fit: contain; }
          .intro-logo-box .logo-text {
            font-size: 18pt;
            font-weight: 900;
            color: var(--teal-700);
          }

          /* ─── TABLES ──────────────────────────────────────── */
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
          }
          table.data-table thead tr {
            background: var(--teal-800);
          }
          table.data-table th {
            padding: 9px 12px;
            text-align: left;
            font-size: 7.5pt;
            font-weight: 800;
            color: white;
            letter-spacing: .8px;
            text-transform: uppercase;
          }
          table.data-table th.r { text-align: right; }
          table.data-table td {
            padding: 8px 12px;
            border-bottom: 1px solid var(--gray-100);
            color: var(--gray-700);
            vertical-align: top;
          }
          table.data-table td.r { text-align: right; }
          table.data-table td.mono {
            font-family: 'Courier New', monospace;
            font-size: 7.5pt;
            color: var(--gray-400);
            font-weight: 600;
          }
          table.data-table tbody tr:nth-child(even) td { background: var(--gray-50); }
          table.data-table tbody tr:hover td { background: var(--teal-50); }

          table.data-table tfoot td {
            padding: 10px 12px;
            font-weight: 800;
            font-size: 9pt;
            color: var(--teal-800);
            background: var(--teal-50);
            border-top: 2px solid var(--teal-400);
          }
          table.data-table tfoot td.r { text-align: right; }

          /* ─── TOTALS ──────────────────────────────────────── */
          .totals-wrap {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
          }
          .totals-card {
            width: 320px;
            border: 1px solid var(--gray-200);
            border-radius: 10px;
            overflow: hidden;
          }
          .totals-head {
            background: var(--teal-800);
            padding: 10px 16px;
            font-size: 8pt;
            font-weight: 800;
            color: white;
            text-transform: uppercase;
            letter-spacing: 1.5px;
          }
          .totals-body { padding: 4px 16px 12px; }
          .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 7px 0;
            font-size: 9pt;
            border-bottom: 1px solid var(--gray-100);
          }
          .total-row:last-child { border-bottom: none; }
          .total-row .lbl { color: var(--gray-500); font-weight: 600; }
          .total-row .val { font-weight: 700; color: var(--gray-900); }
          .total-row.disc .val { color: #dc2626; }
          .total-row.grand {
            margin-top: 4px;
            padding-top: 10px;
            border-top: 2px solid var(--teal-400) !important;
          }
          .total-row.grand .lbl { font-size: 10pt; font-weight: 800; color: var(--teal-800); }
          .total-row.grand .val { font-size: 14pt; font-weight: 900; color: var(--teal-700); }
          .total-row.marg .val { color: #15803d; }

          /* ─── SIGNATURE ───────────────────────────────────── */
          .sig-section {
            margin-top: 32px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 48px;
          }
          .sig-box {
            border: 1px solid var(--gray-200);
            border-radius: 10px;
            overflow: hidden;
          }
          .sig-head {
            padding: 8px 16px;
            background: var(--gray-50);
            border-bottom: 1px solid var(--gray-200);
            font-size: 7.5pt;
            font-weight: 800;
            color: var(--gray-500);
            text-transform: uppercase;
            letter-spacing: 1.2px;
          }
          .sig-body { padding: 40px 16px 16px; }
          .sig-line {
            border-top: 1.5px solid var(--gray-700);
            padding-top: 8px;
            text-align: center;
            font-size: 9pt;
            font-weight: 700;
            color: var(--gray-700);
          }
          .sig-sub {
            text-align: center;
            font-size: 8pt;
            color: var(--gray-400);
            margin-top: 4px;
            font-weight: 500;
          }

          /* ─── VALIDITY CARD ───────────────────────────────── */
          .validity-card {
            border-left: 4px solid var(--teal-500);
            background: var(--teal-50);
            border-radius: 0 8px 8px 0;
            padding: 16px 20px;
            margin-bottom: 28px;
            font-size: 9.5pt;
            color: var(--teal-800);
            line-height: 1.6;
            font-weight: 500;
          }
          .validity-card strong { font-weight: 800; color: var(--teal-700); }

          /* ─── PRINT ───────────────────────────────────────── */
          @media print {
            .toolbar { display: none !important; }
            body { background: white; }
            .outer { padding: 0; max-width: none; }
            .pdf-page {
              box-shadow: none;
              border-radius: 0;
              margin-bottom: 0;
              page-break-after: always;
            }
            .pdf-page:last-child { page-break-after: auto; }
            .inner-page { min-height: 100vh; }
          }
        `}</style>
      </head>
      <body>

        {/* ─── TOOLBAR ─── */}
        <div className="toolbar no-print" style={{ display: 'flex' }}>
          <div className="toolbar-left">
            {logoSrc
              ? <img src={logoSrc} alt="" style={{ height: 28, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
              : <div className="toolbar-logo">P</div>
            }
            <div>
              <div className="toolbar-title">{companyName}</div>
              <div className="toolbar-sub">{proposal.number} · {proposal.customer.companyName}</div>
            </div>
          </div>
          <div className="toolbar-right">
            <button id="btn-print" className="btn-toolbar btn-print">Imprimir / PDF</button>
            <button id="btn-close" className="btn-toolbar btn-close">✕ Fechar</button>
          </div>
        </div>

        <div className="outer">

          {/* ══════════════════════════════════════════════════
               PÁGINA 1 — CAPA
          ══════════════════════════════════════════════════ */}
          <div className="pdf-page">
            <div className="cover">

              {/* Top bar */}
              <div className="cover-top">
                <div>
                  {logoSrc
                    ? <div className="cover-logo-wrap"><img src={logoSrc} alt={companyName} /></div>
                    : <>
                        <div className="cover-logo-text">{companyName}</div>
                        <div className="cover-logo-sub">Distribuidora de Tecnologia</div>
                      </>
                  }
                </div>
                <div className="cover-badge">Proposta Comercial</div>
              </div>

              {/* Center content */}
              <div className="cover-body">
                <div className="cover-eyebrow">{proposal.vertical}</div>
                <div className="cover-title">{proposal.title}</div>
                <div className="cover-divider" />
                <div className="cover-client-label">Elaborada para</div>
                <div className="cover-client-name">{proposal.customer.companyName}</div>
              </div>

              {/* Footer strip */}
              <div className="cover-footer">
                <div className="cover-footer-item">
                  <label>Nº da Proposta</label>
                  <span>{proposal.number}</span>
                </div>
                <div className="cover-footer-item">
                  <label>Data de Emissão</label>
                  <span>{today}</span>
                </div>
                <div className="cover-footer-item">
                  <label>Validade</label>
                  <span>Até {validUntil}</span>
                </div>
              </div>

            </div>
          </div>

          {/* ══════════════════════════════════════════════════
               PÁGINA 2 — DADOS & RESUMO
          ══════════════════════════════════════════════════ */}
          <div className="pdf-page">
            <div className="inner-page">
              <div className="page-header">
                {logoSrc
                  ? <div className="page-header-logo"><img src={logoSrc} alt={companyName} /></div>
                  : <div className="page-header-logo-text">{companyName}</div>
                }
                <div className="page-header-meta">
                  <strong>{proposal.number}</strong>
                  {proposal.customer.companyName}
                </div>
              </div>

              <div className="page-content">

                {/* Dados da proposta */}
                <div className="section">
                  <div className="section-heading"><h2>Dados da Proposta</h2></div>
                  <div className="info-grid">
                    {/* Plantec */}
                    <div className="info-card">
                      <div className="info-card-head">Fornecedor</div>
                      <div className="info-card-body">
                        <div className="info-row">
                          <span className="info-label">Empresa</span>
                          <span className="info-val">{companyName}</span>
                        </div>
                        {companyWebsite && <div className="info-row">
                          <span className="info-label">Site</span>
                          <span className="info-val">{companyWebsite}</span>
                        </div>}
                        {companyEmail && <div className="info-row">
                          <span className="info-label">E-mail</span>
                          <span className="info-val">{companyEmail}</span>
                        </div>}
                        {companyPhone && <div className="info-row">
                          <span className="info-label">Telefone</span>
                          <span className="info-val">{companyPhone}</span>
                        </div>}
                        {companyAddress && <div className="info-row">
                          <span className="info-label">Endereço</span>
                          <span className="info-val">{companyAddress}</span>
                        </div>}
                      </div>
                    </div>

                    {/* Cliente */}
                    <div className="info-card">
                      <div className="info-card-head">Cliente</div>
                      <div className="info-card-body">
                        <div className="info-row">
                          <span className="info-label">Razão Social</span>
                          <span className="info-val">{proposal.customer.companyName}</span>
                        </div>
                        {proposal.customer.tradeName && <div className="info-row">
                          <span className="info-label">Fantasia</span>
                          <span className="info-val">{proposal.customer.tradeName}</span>
                        </div>}
                        {proposal.customer.cnpj && <div className="info-row">
                          <span className="info-label">CNPJ</span>
                          <span className="info-val">{proposal.customer.cnpj}</span>
                        </div>}
                        {proposal.customer.contactName && <div className="info-row">
                          <span className="info-label">Contato</span>
                          <span className="info-val">{proposal.customer.contactName}</span>
                        </div>}
                        {proposal.customer.email && <div className="info-row">
                          <span className="info-label">E-mail</span>
                          <span className="info-val">{proposal.customer.email}</span>
                        </div>}
                        {proposal.customer.city && <div className="info-row">
                          <span className="info-label">Cidade</span>
                          <span className="info-val">{proposal.customer.city}{proposal.customer.state ? `/${proposal.customer.state}` : ''}</span>
                        </div>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumo Executivo */}
                {proposal.executiveSummary && (
                  <div className="section">
                    <div className="section-heading"><h2>Resumo Executivo</h2></div>
                    <div className="text-content">{proposal.executiveSummary}</div>
                  </div>
                )}

                {/* Escopo */}
                {proposal.scope && (
                  <div className="section">
                    <div className="section-heading"><h2>Escopo do Projeto</h2></div>
                    <div className="text-content">{proposal.scope}</div>
                  </div>
                )}

                {/* Sobre a empresa */}
                {companyDescription && (
                  <div className="section">
                    <div className="section-heading"><h2>Sobre a {companyName}</h2></div>
                    {logoSrc
                      ? <div className="intro-grid">
                          <div className="intro-logo-box"><img src={logoSrc} alt={companyName} /></div>
                          <div className="text-content">{companyDescription}</div>
                        </div>
                      : <div className="text-content">{companyDescription}</div>
                    }
                  </div>
                )}
              </div>

              <div className="page-footer">
                <span>{companyName} · Proposta Comercial</span>
                <div className="footer-bar" />
                <span>{proposal.number} · {today}</span>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
               PÁGINA 3 — BOM COMERCIAL
          ══════════════════════════════════════════════════ */}
          <div className="pdf-page">
            <div className="inner-page">
              <div className="page-header">
                {logoSrc
                  ? <div className="page-header-logo"><img src={logoSrc} alt={companyName} /></div>
                  : <div className="page-header-logo-text">{companyName}</div>
                }
                <div className="page-header-meta">
                  <strong>{proposal.number}</strong>
                  {proposal.customer.companyName}
                </div>
              </div>

              <div className="page-content">
                <div className="section">
                  <div className="section-heading"><h2>BOM Comercial</h2></div>

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '9%' }}>SKU</th>
                        <th style={{ width: '38%' }}>Produto / Descrição</th>
                        <th className="r" style={{ width: '6%' }}>Qtd</th>
                        <th className="r" style={{ width: '14%' }}>Preço Unit.</th>
                        <th className="r" style={{ width: '8%' }}>Desc.</th>
                        <th className="r" style={{ width: '14%' }}>Subtotal</th>
                        <th className="r" style={{ width: '8%' }}>Margem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.items.map((item) => {
                        const price = Number(item.unitPrice)
                        const disc = Number(item.discount)
                        const sub = price * item.quantity * (1 - disc / 100)
                        const cost = Number(item.cost) * item.quantity
                        const marg = sub > 0 ? ((sub - cost) / sub) * 100 : 0
                        return (
                          <tr key={item.id}>
                            <td className="mono">{item.product.sku}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: '#0F172A' }}>{item.product.name}</span>
                              {item.product.brand && (
                                <span style={{ display: 'block', fontSize: '7.5pt', color: '#94A3B8', fontWeight: 500, marginTop: 1 }}>
                                  {item.product.brand} · {item.product.category}
                                </span>
                              )}
                            </td>
                            <td className="r" style={{ fontWeight: 700 }}>{item.quantity}</td>
                            <td className="r">{fmt(price)}</td>
                            <td className="r" style={{ color: disc > 0 ? '#dc2626' : '#94A3B8' }}>
                              {disc > 0 ? `${disc}%` : '—'}
                            </td>
                            <td className="r" style={{ fontWeight: 800, color: '#0F172A' }}>{fmt(sub)}</td>
                            <td className="r" style={{ fontWeight: 700, color: marg >= 15 ? '#15803d' : marg >= 10 ? '#b45309' : '#dc2626' }}>
                              {fmtPct(marg)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="r">Total da Proposta</td>
                        <td className="r" style={{ fontSize: '10.5pt' }}>{fmt(totalPrice)}</td>
                        <td className="r" style={{ color: margin >= 15 ? '#15803d' : margin >= 10 ? '#b45309' : '#dc2626' }}>
                          {fmtPct(margin)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="totals-wrap">
                    <div className="totals-card">
                      <div className="totals-head">Resumo Financeiro</div>
                      <div className="totals-body">
                        <div className="total-row">
                          <span className="lbl">Subtotal</span>
                          <span className="val">{fmt(subtotal)}</span>
                        </div>
                        {totalDiscount > 0 && (
                          <div className="total-row disc">
                            <span className="lbl">Descontos</span>
                            <span className="val">– {fmt(totalDiscount)}</span>
                          </div>
                        )}
                        <div className="total-row grand">
                          <span className="lbl">Total</span>
                          <span className="val">{fmt(totalPrice)}</span>
                        </div>
                        <div className="total-row marg">
                          <span className="lbl">Margem estimada</span>
                          <span className="val">{fmtPct(margin)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="page-footer">
                <span>{companyName} · Proposta Comercial</span>
                <div className="footer-bar" />
                <span>{proposal.number} · {today}</span>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
               PÁGINA 4 — BOM TÉCNICA
          ══════════════════════════════════════════════════ */}
          <div className="pdf-page">
            <div className="inner-page">
              <div className="page-header">
                {logoSrc
                  ? <div className="page-header-logo"><img src={logoSrc} alt={companyName} /></div>
                  : <div className="page-header-logo-text">{companyName}</div>
                }
                <div className="page-header-meta">
                  <strong>{proposal.number}</strong>
                  {proposal.customer.companyName}
                </div>
              </div>

              <div className="page-content">
                <div className="section">
                  <div className="section-heading"><h2>BOM Técnica — Anexo</h2></div>

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '10%' }}>SKU</th>
                        <th style={{ width: '32%' }}>Produto</th>
                        <th className="r" style={{ width: '7%' }}>Qtd</th>
                        <th style={{ width: '12%' }}>Categoria</th>
                        <th style={{ width: '18%' }}>Função na Solução</th>
                        <th style={{ width: '21%' }}>Obs. Técnica</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.items.map((item) => (
                        <tr key={item.id}>
                          <td className="mono">{item.product.sku}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>{item.product.name}</span>
                            {item.product.description && (
                              <div style={{ fontSize: '7.5pt', color: '#94A3B8', marginTop: 2, fontWeight: 500, lineHeight: 1.4 }}>
                                {item.product.description.slice(0, 100)}{item.product.description.length > 100 ? '…' : ''}
                              </div>
                            )}
                          </td>
                          <td className="r" style={{ fontWeight: 700 }}>{item.quantity}{item.product.unit ? ` ${item.product.unit}` : ''}</td>
                          <td style={{ color: '#64748B', fontWeight: 600 }}>{item.product.category}</td>
                          <td>{item.role ?? '—'}</td>
                          <td style={{ fontSize: '7.5pt', color: '#64748B' }}>{item.technicalNotes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="page-footer">
                <span>{companyName} · Proposta Comercial</span>
                <div className="footer-bar" />
                <span>{proposal.number} · {today}</span>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
               PÁGINA 5 — CONDIÇÕES & ACEITE
          ══════════════════════════════════════════════════ */}
          <div className="pdf-page">
            <div className="inner-page">
              <div className="page-header">
                {logoSrc
                  ? <div className="page-header-logo"><img src={logoSrc} alt={companyName} /></div>
                  : <div className="page-header-logo-text">{companyName}</div>
                }
                <div className="page-header-meta">
                  <strong>{proposal.number}</strong>
                  {proposal.customer.companyName}
                </div>
              </div>

              <div className="page-content">

                {/* Condições Comerciais */}
                {proposal.commercialTerms && (
                  <div className="section">
                    <div className="section-heading"><h2>Condições Comerciais</h2></div>
                    <div className="text-content">{proposal.commercialTerms}</div>
                  </div>
                )}

                {/* Validade */}
                <div className="section">
                  <div className="section-heading"><h2>Validade e Aceite</h2></div>

                  <div className="validity-card">
                    Esta proposta é válida por <strong>{proposal.validityDays} dias</strong> a partir de {today},
                    ou seja, até <strong>{validUntil}</strong>.
                    Após este prazo, os valores e condições aqui descritos estão sujeitos a revisão.
                  </div>

                  <div className="sig-section">
                    <div className="sig-box">
                      <div className="sig-head">Fornecedor</div>
                      <div className="sig-body">
                        <div className="sig-line">{companyName}</div>
                        <div className="sig-sub">Responsável comercial</div>
                      </div>
                    </div>
                    <div className="sig-box">
                      <div className="sig-head">Cliente</div>
                      <div className="sig-body">
                        <div className="sig-line">{proposal.customer.companyName}</div>
                        <div className="sig-sub">{proposal.customer.contactName ?? 'Representante autorizado'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div style={{ marginTop: 40, textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 16px',
                    borderRadius: 20,
                    fontSize: '9pt',
                    fontWeight: 800,
                    letterSpacing: '.5px',
                    textTransform: 'uppercase',
                    color: statusColor[proposal.status] ?? '#6b7280',
                    border: `1.5px solid ${statusColor[proposal.status] ?? '#6b7280'}`,
                    background: 'transparent',
                  }}>
                    {statusLabel[proposal.status] ?? proposal.status}
                  </span>
                </div>

              </div>

              <div className="page-footer">
                <span>{companyName} · Proposta Comercial</span>
                <div className="footer-bar" />
                <span>{proposal.number} · {today}</span>
              </div>
            </div>
          </div>

        </div>{/* /outer */}

        <script dangerouslySetInnerHTML={{ __html: `
          document.getElementById('btn-print').addEventListener('click', function() { window.print(); });
          document.getElementById('btn-close').addEventListener('click', function() { window.close(); });
        `}} />
      </body>
    </html>
  )
}
