export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

// Contract expected from the external projects API:
// GET {EXTERNAL_PROJECTS_URL}/projects
// Headers: Authorization: Bearer {EXTERNAL_PROJECTS_TOKEN}   (optional)
// Response: ExternalProject[]
export interface ExternalProject {
  id: string
  title: string
  vertical: string       // e.g. "CFTV", "Redes", "Telecom", "Infraestrutura"
  scope: string          // free-text scope description
  createdAt: string      // ISO 8601
  customer: {
    companyName: string
    cnpj?: string
    contactName?: string
    email?: string
    phone?: string
    city?: string
    state?: string
  }
}

export async function GET() {
  const baseUrl = process.env.EXTERNAL_PROJECTS_URL?.trim()
  const token   = process.env.EXTERNAL_PROJECTS_TOKEN?.trim()

  if (!baseUrl) {
    return NextResponse.json(
      { error: 'EXTERNAL_PROJECTS_URL não configurado em .env', projects: [] },
      { status: 503 },
    )
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${baseUrl}/projects`, { headers, next: { revalidate: 0 } })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `Sistema externo retornou ${res.status}: ${text.slice(0, 200)}`, projects: [] },
        { status: 502 },
      )
    }

    const data = await res.json()
    // Accept both { projects: [...] } and plain array
    const projects: ExternalProject[] = Array.isArray(data) ? data : (data.projects ?? [])

    return NextResponse.json({ projects })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Falha ao conectar: ${msg}`, projects: [] }, { status: 502 })
  }
}
