// Validade da proposta em dias: escolhida na criação e no editor, até 90 dias.
export const VALIDADE_MAX = 90
export const OPCOES_VALIDADE = [5, 7, 10, 15, 20, 30, 45, 60, 90]

// Valor recebido pela API → inteiro de 1 a 90 (undefined se não veio).
export function validadeDias(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return undefined
  return Math.min(VALIDADE_MAX, Math.max(1, n))
}
