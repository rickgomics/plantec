'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  code: string
  className?: string
}

export default function MermaidDiagram({ code, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code || !ref.current) return

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
  }, [code])

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
      className={`flex justify-center p-4 bg-white rounded-xl overflow-auto ${className}`}
    />
  )
}
