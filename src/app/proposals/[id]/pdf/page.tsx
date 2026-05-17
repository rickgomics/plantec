import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function ProposalPDFPage({ params }: { params: { id: string } }) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
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
    (s, i) => s + Number(i.unitPrice) * i.quantity,
    0
  )
  const totalDiscount = Number(proposal.totalDiscount)
  const totalPrice = Number(proposal.totalPrice)
  const margin = Number(proposal.margin)

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const validUntil = new Date(
    Date.now() + proposal.validityDays * 24 * 60 * 60 * 1000
  ).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <html lang="pt-BR">
      <head>
        <title>Proposta {proposal.number}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #1a1a1a; background: white; }
          .page { max-width: 800px; margin: 0 auto; padding: 40px; }

          /* Cover */
          .cover { min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; border-left: 6px solid #1B3A6B; padding: 60px 60px 60px 54px; }
          .cover-header { color: #1B3A6B; }
          .company-name { font-size: 32pt; font-weight: 900; letter-spacing: -1px; }
          .company-tag { font-size: 12pt; color: #6b7280; margin-top: 4px; }
          .cover-title { flex: 1; display: flex; flex-direction: column; justify-content: center; }
          .cover-title h1 { font-size: 22pt; font-weight: 700; color: #1B3A6B; line-height: 1.3; }
          .cover-title .number { font-size: 12pt; color: #6b7280; margin-bottom: 12px; }
          .cover-meta { font-size: 10pt; color: #6b7280; }
          .cover-meta table td { padding: 3px 12px 3px 0; }
          .cover-meta .label { font-weight: 600; color: #374151; }

          /* Sections */
          .section { margin-bottom: 32px; }
          .section-title {
            font-size: 14pt; font-weight: 700; color: #1B3A6B;
            border-bottom: 2px solid #1B3A6B; padding-bottom: 6px; margin-bottom: 16px;
          }
          .section-sub { font-size: 11pt; font-weight: 600; color: #374151; margin-bottom: 8px; }

          /* Info grid */
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
          .info-box { background: #f9fafb; border-radius: 8px; padding: 16px; }
          .info-row { display: flex; gap: 8px; margin-bottom: 6px; font-size: 10pt; }
          .info-label { font-weight: 600; color: #374151; min-width: 80px; }
          .info-val { color: #1a1a1a; }

          /* Tables */
          table.bom { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
          table.bom th {
            background: #1B3A6B; color: white; padding: 8px 10px;
            text-align: left; font-size: 9pt; font-weight: 600;
          }
          table.bom th.right { text-align: right; }
          table.bom td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
          table.bom td.right { text-align: right; }
          table.bom td.mono { font-family: monospace; font-size: 8.5pt; color: #6b7280; }
          table.bom tr:nth-child(even) td { background: #f9fafb; }
          .bom-footer { background: #f3f4f6 !important; }
          .bom-footer td { font-weight: 700; border-top: 2px solid #1B3A6B; }

          /* Totals box */
          .totals-box { margin-left: auto; width: 300px; background: #f9fafb; border-radius: 8px; padding: 16px; }
          .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 10pt; }
          .total-row.grand { font-size: 13pt; font-weight: 700; color: #1B3A6B; border-top: 2px solid #1B3A6B; padding-top: 8px; margin-top: 4px; }
          .total-row.margin { color: #15803d; font-weight: 600; }

          /* Signature */
          .sig-box { border: 1px solid #d1d5db; border-radius: 8px; padding: 24px; margin-top: 24px; }
          .sig-line { border-top: 1px solid #374151; margin-top: 48px; padding-top: 8px; font-size: 10pt; color: #6b7280; text-align: center; }

          .text-content { font-size: 10pt; line-height: 1.7; color: #374151; white-space: pre-line; }
          .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 9pt; font-weight: 600; }
          .badge-draft { background: #f3f4f6; color: #374151; }
          .badge-generated { background: #dbeafe; color: #1d4ed8; }
          .badge-sent { background: #fef9c3; color: #854d0e; }
          .badge-approved { background: #dcfce7; color: #15803d; }

          @media print {
            .no-print { display: none; }
            .page-break { page-break-before: always; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        `}</style>
      </head>
      <body>
        {/* Print button - no-print */}
        <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', gap: 8 }}>
          <button
            id="btn-print"
            style={{ background: '#1B3A6B', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            🖨️ Imprimir / Exportar PDF
          </button>
          <button
            id="btn-close"
            style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            ✕ Fechar
          </button>
        </div>

        <div className="page">
          {/* COVER PAGE */}
          <div className="cover">
            <div className="cover-header">
              <div className="company-name">Plantec</div>
              <div className="company-tag">Distribuidora de Tecnologia</div>
            </div>
            <div className="cover-title">
              <div className="number">Proposta Comercial · {proposal.number}</div>
              <h1>{proposal.title}</h1>
            </div>
            <div className="cover-meta">
              <table>
                <tbody>
                  <tr>
                    <td className="label">Cliente:</td>
                    <td>{proposal.customer.companyName}</td>
                  </tr>
                  <tr>
                    <td className="label">Vertical:</td>
                    <td>{proposal.vertical}</td>
                  </tr>
                  <tr>
                    <td className="label">Data:</td>
                    <td>{today}</td>
                  </tr>
                  <tr>
                    <td className="label">Validade:</td>
                    <td>Até {validUntil}</td>
                  </tr>
                  <tr>
                    <td className="label">Status:</td>
                    <td>
                      <span className={`badge badge-${proposal.status}`}>{proposal.status.toUpperCase()}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="page-break" />

          {/* DADOS */}
          <div className="section">
            <div className="section-title">Dados da Proposta</div>
            <div className="info-grid">
              <div className="info-box">
                <div className="section-sub">Plantec Distribuidora</div>
                <div className="info-row"><span className="info-label">Empresa:</span><span className="info-val">Plantec Distribuidora de Tecnologia</span></div>
                <div className="info-row"><span className="info-label">Site:</span><span className="info-val">www.plantec.com.br</span></div>
                <div className="info-row"><span className="info-label">E-mail:</span><span className="info-val">comercial@plantec.com.br</span></div>
              </div>
              <div className="info-box">
                <div className="section-sub">Cliente</div>
                <div className="info-row"><span className="info-label">Empresa:</span><span className="info-val">{proposal.customer.companyName}</span></div>
                {proposal.customer.tradeName && <div className="info-row"><span className="info-label">Fantasia:</span><span className="info-val">{proposal.customer.tradeName}</span></div>}
                {proposal.customer.cnpj && <div className="info-row"><span className="info-label">CNPJ:</span><span className="info-val">{proposal.customer.cnpj}</span></div>}
                {proposal.customer.contactName && <div className="info-row"><span className="info-label">Contato:</span><span className="info-val">{proposal.customer.contactName}</span></div>}
                {proposal.customer.email && <div className="info-row"><span className="info-label">E-mail:</span><span className="info-val">{proposal.customer.email}</span></div>}
                {proposal.customer.city && <div className="info-row"><span className="info-label">Cidade:</span><span className="info-val">{proposal.customer.city}/{proposal.customer.state}</span></div>}
              </div>
            </div>
          </div>

          {proposal.executiveSummary && (
            <div className="section">
              <div className="section-title">Resumo Executivo</div>
              <div className="text-content">{proposal.executiveSummary}</div>
            </div>
          )}

          {proposal.scope && (
            <div className="section">
              <div className="section-title">Escopo do Projeto</div>
              <div className="text-content">{proposal.scope}</div>
            </div>
          )}

          {/* BOM COMERCIAL */}
          <div className="section page-break">
            <div className="section-title">BOM Comercial</div>
            <table className="bom">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Produto</th>
                  <th className="right">Qtd</th>
                  <th className="right">Preço Unit.</th>
                  <th className="right">Desc %</th>
                  <th className="right">Subtotal</th>
                  <th className="right">Margem</th>
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
                        <strong>{item.product.name}</strong>
                        {item.product.brand && <span style={{ color: '#6b7280', fontSize: '9pt' }}> · {item.product.brand}</span>}
                      </td>
                      <td className="right">{item.quantity}</td>
                      <td className="right">{fmt(price)}</td>
                      <td className="right">{disc > 0 ? `${disc}%` : '-'}</td>
                      <td className="right"><strong>{fmt(sub)}</strong></td>
                      <td className="right" style={{ color: marg >= 15 ? '#15803d' : marg >= 10 ? '#854d0e' : '#dc2626' }}>
                        {fmtPct(marg)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bom-footer">
                  <td colSpan={5} className="right"><strong>TOTAL</strong></td>
                  <td className="right"><strong>{fmt(totalPrice)}</strong></td>
                  <td className="right" style={{ color: margin >= 15 ? '#15803d' : margin >= 10 ? '#854d0e' : '#dc2626' }}>
                    <strong>{fmtPct(margin)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>

            <div style={{ marginTop: 24 }}>
              <div className="totals-box">
                <div className="total-row"><span>Subtotal:</span><span>{fmt(subtotal)}</span></div>
                {totalDiscount > 0 && (
                  <div className="total-row" style={{ color: '#dc2626' }}>
                    <span>Descontos:</span><span>-{fmt(totalDiscount)}</span>
                  </div>
                )}
                <div className="total-row grand"><span>Total:</span><span>{fmt(totalPrice)}</span></div>
                <div className="total-row margin"><span>Margem estimada:</span><span>{fmtPct(margin)}</span></div>
              </div>
            </div>
          </div>

          {/* BOM TÉCNICA */}
          <div className="section page-break">
            <div className="section-title">BOM Técnica (Anexo)</div>
            <table className="bom">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Produto</th>
                  <th className="right">Qtd</th>
                  <th>Categoria</th>
                  <th>Função na Solução</th>
                  <th>Observação Técnica</th>
                </tr>
              </thead>
              <tbody>
                {proposal.items.map((item) => (
                  <tr key={item.id}>
                    <td className="mono">{item.product.sku}</td>
                    <td>
                      <strong>{item.product.name}</strong>
                      {item.product.description && (
                        <div style={{ fontSize: '8.5pt', color: '#6b7280', marginTop: 2 }}>{item.product.description}</div>
                      )}
                    </td>
                    <td className="right">{item.quantity} {item.product.unit}</td>
                    <td>{item.product.category}</td>
                    <td>{item.role ?? '-'}</td>
                    <td>{item.technicalNotes ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CONDIÇÕES COMERCIAIS */}
          {proposal.commercialTerms && (
            <div className="section">
              <div className="section-title">Condições Comerciais</div>
              <div className="text-content">{proposal.commercialTerms}</div>
            </div>
          )}

          {/* VALIDADE E ACEITE */}
          <div className="section">
            <div className="section-title">Validade e Aceite</div>
            <p className="text-content">
              Esta proposta é válida por <strong>{proposal.validityDays} dias</strong> a partir de {today}, ou seja, até <strong>{validUntil}</strong>.
            </p>

            <div className="sig-box" style={{ marginTop: 32 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
                <div>
                  <div className="sig-line">Plantec Distribuidora de Tecnologia</div>
                  <div style={{ textAlign: 'center', marginTop: 6, color: '#6b7280', fontSize: '9.5pt' }}>Responsável comercial</div>
                </div>
                <div>
                  <div className="sig-line">{proposal.customer.companyName}</div>
                  <div style={{ textAlign: 'center', marginTop: 6, color: '#6b7280', fontSize: '9.5pt' }}>{proposal.customer.contactName ?? 'Representante autorizado'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          document.getElementById('btn-print').addEventListener('click', function() { window.print(); });
          document.getElementById('btn-close').addEventListener('click', function() { window.close(); });
        `}} />
      </body>
    </html>
  )
}
