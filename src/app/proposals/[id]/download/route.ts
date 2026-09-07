export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { chromium } from 'playwright'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    select: { number: true, customer: { select: { companyName: true } } },
  })
  if (!proposal) return new Response('Not found', { status: 404 })

  const origin = req.nextUrl.origin
  const basePath = process.env.NEXT_BASE_PATH ?? ''
  const htmlUrl = `${origin}${basePath}/proposals/${params.id}/pdf`

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  try {
    const page = await browser.newPage()

    await page.goto(htmlUrl, { waitUntil: 'networkidle', timeout: 30000 })

    // Wait for web fonts and any async renders
    await page.waitForTimeout(1500)

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
    })

    const filename = `Proposta-${proposal.number}-${proposal.customer.companyName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`

    return new Response(pdfBuffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } finally {
    await browser.close()
  }
}
