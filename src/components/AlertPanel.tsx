'use client'

import { RuleEngineResult, RuleAlert } from '@/types'

interface AlertPanelProps {
  result: RuleEngineResult | null
  onAddSuggestion?: (skus: string[]) => void
}

function AlertItem({ alert, onAction }: { alert: RuleAlert; onAction?: (skus: string[]) => void }) {
  const styles = {
    error:   'bg-red-50 border-red-100 text-red-800',
    warning: 'bg-amber-50 border-amber-100 text-amber-800',
    info:    'bg-brand-50 border-brand-100 text-brand-800',
  }
  const icons = { error: '✕', warning: '!', info: '→' }

  return (
    <div className={`rounded-xl border p-3 text-sm ${styles[alert.severity]}`}>
      <div className="flex items-start gap-2.5">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5
          ${alert.severity === 'error' ? 'bg-red-200 text-red-700' :
            alert.severity === 'warning' ? 'bg-amber-200 text-amber-700' :
            'bg-brand-200 text-brand-700'}`}>
          {icons[alert.severity]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-xs uppercase tracking-wide opacity-70 mb-0.5">{alert.ruleName}</p>
          <p className="font-medium leading-snug">{alert.message}</p>
          {alert.skus && alert.skus.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {alert.skus.map((sku) => (
                <span key={sku} className="font-mono text-[10px] bg-white/70 px-1.5 py-0.5 rounded-md border border-current/20 font-semibold">
                  {sku}
                </span>
              ))}
            </div>
          )}
          {alert.type === 'suggestion' && onAction && alert.skus && alert.skus.length > 0 && (
            <button
              onClick={() => onAction(alert.skus!)}
              className="mt-2 text-xs font-bold underline underline-offset-2 hover:no-underline"
            >
              + Adicionar à BOM
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AlertPanel({ result, onAddSuggestion }: AlertPanelProps) {
  if (!result) {
    return (
      <div className="card p-5">
        <h3 className="font-bold text-gray-700 text-sm mb-3 uppercase tracking-wider">Análise da BOM</h3>
        <div className="text-center py-6">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-300 text-xl">
            ◎
          </div>
          <p className="text-xs text-gray-400 font-medium">
            Adicione produtos para ver<br/>alertas e sugestões.
          </p>
        </div>
      </div>
    )
  }

  const totalIssues = result.errors.length + result.alerts.length + result.suggestions.length

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Análise da BOM</h3>
        {totalIssues === 0 ? (
          <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">✓ OK</span>
        ) : (
          <span className="text-xs text-gray-400 font-semibold">{totalIssues} item(s)</span>
        )}
      </div>

      {result.isBlocked && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-semibold">
          Proposta bloqueada — resolva os erros críticos antes de gerar.
        </div>
      )}

      {result.errors.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Erros ({result.errors.length})</p>
          {result.errors.map((a, i) => <AlertItem key={i} alert={a} />)}
        </div>
      )}

      {result.alerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Alertas ({result.alerts.length})</p>
          {result.alerts.map((a, i) => <AlertItem key={i} alert={a} />)}
        </div>
      )}

      {result.suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Sugestões ({result.suggestions.length})</p>
          {result.suggestions.map((a, i) => <AlertItem key={i} alert={a} onAction={onAddSuggestion} />)}
        </div>
      )}

      {totalIssues === 0 && !result.isBlocked && (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2 text-emerald-500 text-xl font-black">✓</div>
          <p className="text-xs text-gray-500 font-semibold">BOM válida</p>
        </div>
      )}
    </div>
  )
}
