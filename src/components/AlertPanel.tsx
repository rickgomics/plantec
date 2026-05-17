'use client'

import { RuleEngineResult, RuleAlert } from '@/types'

interface AlertPanelProps {
  result: RuleEngineResult | null
  onAddSuggestion?: (skus: string[]) => void
}

function AlertItem({ alert, onAction }: { alert: RuleAlert; onAction?: (skus: string[]) => void }) {
  const colors = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }
  const icons = { error: '🚫', warning: '⚠️', info: '💡' }

  return (
    <div className={`rounded-lg border p-3 text-sm ${colors[alert.severity]}`}>
      <div className="flex items-start gap-2">
        <span className="text-base flex-shrink-0">{icons[alert.severity]}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{alert.ruleName}</p>
          <p className="mt-0.5 opacity-80">{alert.message}</p>
          {alert.skus && alert.skus.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {alert.skus.map((sku) => (
                <span key={sku} className="font-mono text-xs bg-white/60 px-1.5 py-0.5 rounded border border-current/20">
                  {sku}
                </span>
              ))}
            </div>
          )}
          {alert.type === 'suggestion' && onAction && alert.skus && alert.skus.length > 0 && (
            <button
              onClick={() => onAction(alert.skus!)}
              className="mt-2 text-xs font-medium underline hover:no-underline"
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
      <div className="card p-4">
        <h3 className="font-semibold text-gray-700 mb-2">Análise da BOM</h3>
        <p className="text-sm text-gray-400 text-center py-6">
          Adicione produtos à BOM para ver alertas e sugestões.
        </p>
      </div>
    )
  }

  const totalIssues =
    result.errors.length + result.alerts.length + result.suggestions.length

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">Análise da BOM</h3>
        {totalIssues === 0 ? (
          <span className="text-xs text-green-600 font-medium">✓ Sem alertas</span>
        ) : (
          <span className="text-xs text-gray-500">{totalIssues} item(s)</span>
        )}
      </div>

      {result.isBlocked && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700 font-medium">
          🚫 Proposta bloqueada — resolva os erros críticos antes de gerar.
        </div>
      )}

      {result.errors.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
            Erros ({result.errors.length})
          </p>
          {result.errors.map((a, i) => (
            <AlertItem key={i} alert={a} />
          ))}
        </div>
      )}

      {result.alerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide">
            Alertas ({result.alerts.length})
          </p>
          {result.alerts.map((a, i) => (
            <AlertItem key={i} alert={a} />
          ))}
        </div>
      )}

      {result.suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            Sugestões ({result.suggestions.length})
          </p>
          {result.suggestions.map((a, i) => (
            <AlertItem key={i} alert={a} onAction={onAddSuggestion} />
          ))}
        </div>
      )}

      {totalIssues === 0 && !result.isBlocked && (
        <div className="text-center py-4">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-sm text-gray-500">BOM válida. Nenhum alerta ou sugestão.</p>
        </div>
      )}
    </div>
  )
}
