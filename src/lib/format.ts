/**
 * Valores no formato do Padrão Visual do Portal: como numa apresentação
 * (R$ 3,8 mi, R$ 540 mil, 86,7%), com o valor completo reservado ao hover
 * (title) e às tabelas de conferência.
 */

export function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function fmtCompacto(v: number): string {
  const a = Math.abs(v)
  const n = (x: number, casas: number) => x.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
  if (a >= 1e9) return `R$ ${n(v / 1e9, 1)} bi`
  if (a >= 1e6) return `R$ ${n(v / 1e6, 1)} mi`
  if (a >= 1e4) return `R$ ${n(v / 1e3, 0)} mil`
  return fmtBRL(v)
}

export function fmtPct(v: number, casas = 1): string {
  return `${v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`
}

export function fmtData(d: string | Date): string {
  return new Date(d).toLocaleDateString('pt-BR')
}
