import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Plantec BOM Builder',
  description: 'Gerador de Propostas Comerciais e BOM Técnica - Plantec Distribuidora',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}
