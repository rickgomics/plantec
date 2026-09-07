'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  code: string
  className?: string
}

function isEraserDsl(code: string) {
  return /\[icon:/i.test(code) || /^title\s/im.test(code) || /^direction\s/im.test(code)
}

export default function MermaidDiagram({ code, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const isEraser = isEraserDsl(code)

  // O hook precisa rodar sempre (nunca depois de um return condicional —
  // violava Rules of Hooks, bloqueando o build de produção). A checagem de
  // Eraser DSL agora fica dentro do efeito, mesmo comportamento de antes.
  useEffect(() => {
    if (isEraser || !code || !ref.current) return

    let cancelled = false

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'loose',
          themeVariables: {
            primaryColor: '#E6F5F4',
            primaryTextColor: '#002827',
            primaryBorderColor: '#00928E',
            lineColor: '#007B77',
            secondaryColor: '#F0FAF9',
            tertiaryColor: '#ffffff',
            edgeLabelBackground: '#f8fffe',
            nodeBorder: '#007B77',
            clusterBkg: '#F8FAFC',
            clusterBorder: '#E2E8F0',
            fontFamily: "'Montserrat', Arial, sans-serif",
            fontSize: '13px',
          }
        })

        const id = `mermaid-${Date.now()}`
        const { svg } = await mermaid.render(id, code)

        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao renderizar diagrama')
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [code, isEraser])

  if (isEraser) {
    return (
      <div className={`p-5 bg-violet-50 border border-violet-100 rounded-xl text-sm ${className}`}>
        <p className="font-semibold text-violet-700">Conteúdo é Eraser DSL</p>
        <p className="text-violet-500 text-xs mt-1">Alterne para o modo <strong>✦ Eraser</strong> no seletor acima para visualizar este diagrama.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-100 rounded-xl text-xs ${className}`}>
        <p className="text-sm text-red-600 font-medium">Erro no diagrama</p>
        <pre className="text-xs text-red-500 mt-1 whitespace-pre-wrap">{error}</pre>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={`flex justify-center p-4 bg-surface rounded-xl overflow-auto ${className}`}
    />
  )
}
