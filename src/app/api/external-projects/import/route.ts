export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ExternalProject } from '../route'

interface ImportResult {
  projectId: string
  success: boolean
  proposalNumber?: string
  proposalId?: string
  error?: string
}

async function generateProposalNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.proposal.count({
    where: { number: { startsWith: `PLT-${year}-` } },
  })
  return `PLT-${year}-${String(count + 1).padStart(3, '0')}`
}

// Find existing customer by CNPJ (most reliable) or company name, else create new
async function findOrCreateCustomer(c: ExternalProject['customer']): Promise<string> {
  // Try CNPJ first
  if (c.cnpj) {
    const existing = await prisma.customer.findUnique({ where: { cnpj: c.cnpj } })
    if (existing) return existing.id
  }

  // Try company name
  const byName = await prisma.customer.findFirst({
    where: { companyName: { equals: c.companyName, mode: 'insensitive' } },
  })
  if (byName) return byName.id

  // Create new customer
  const created = await prisma.customer.create({
    data: {
      companyName: c.companyName,
      cnpj: c.cnpj ?? null,
      contactName: c.contactName ?? null,
      email: c.email ?? null,
      phone: c.phone ?? null,
      city: c.city ?? null,
      state: c.state ?? null,
      active: true,
    },
  })
  return created.id
}

export async function POST(req: NextRequest) {
  try {
    const { projects }: { projects: ExternalProject[] } = await req.json()

    if (!Array.isArray(projects) || projects.length === 0) {
      return NextResponse.json({ error: 'Nenhum projeto selecionado' }, { status: 400 })
    }

    const results: ImportResult[] = []

    for (const project of projects) {
      try {
        const customerId = await findOrCreateCustomer(project.customer)
        const number     = await generateProposalNumber()

        // Upsert by externalProjectId: update if already imported, create otherwise
        const proposal = await prisma.proposal.upsert({
          where: { externalProjectId: project.id },
          update: {
            title: project.title,
            vertical: project.vertical,
            customerId,
            scope: project.scope ?? null,
          },
          create: {
            number,
            title: project.title,
            vertical: project.vertical,
            customerId,
            scope: project.scope ?? null,
            status: 'draft',
            discount: 0,
            totalCost: 0,
            totalPrice: 0,
            totalDiscount: 0,
            margin: 0,
            validityDays: 30,
            coverStyle: 'teal',
            externalProjectId: project.id,
          },
        })

        results.push({
          projectId: project.id,
          success: true,
          proposalId: proposal.id,
          proposalNumber: proposal.number,
        })
      } catch (err) {
        results.push({
          projectId: project.id,
          success: false,
          error: err instanceof Error ? err.message : 'Erro desconhecido',
        })
      }
    }

    return NextResponse.json({ results })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
