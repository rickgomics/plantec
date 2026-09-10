export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/prisma'
import { recalcProposal, itemMath } from '@/lib/recalc'
import { fetchPriceBooks, priceFrom, LIST_TABLE, MANUAL_TABLE } from '@/lib/pricing'

/**
 * Atualiza os preços da BOM na tabela escolhida, com o valor ao vivo do
 * Magento. Grava a tabela na proposta e, em cada item, de qual tabela o preço
 * saiu e quando. O custo digitado não é tocado: não há fonte de custo por SKU.
 *
 * Body: { priceTable?: string, includeManual?: boolean }
 * - priceTable ausente = reaplica a tabela que a proposta já tem
 * - itens com preço manual ficam de fora, a menos que includeManual = true
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))

  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: true } } },
  })
  if (!proposal) return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })

  const table: string = body.priceTable ?? proposal.priceTable ?? LIST_TABLE
  const includeManual = Boolean(body.includeManual)

  let books
  try {
    books = await fetchPriceBooks(proposal.items.map(i => i.product.sku))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: `Não foi possível consultar o Magento: ${msg}` }, { status: 502 })
  }

  const agora = new Date()
  const resumo = { atualizados: 0, manuaisMantidos: 0, semPrecoNaTabela: [] as string[], foraDoMagento: [] as string[] }
  const ops: Prisma.PrismaPromise<unknown>[] = []

  for (const item of proposal.items) {
    if (item.priceTable === MANUAL_TABLE && !includeManual) { resumo.manuaisMantidos++; continue }

    const book = books[item.product.sku]
    if (!book) { resumo.foraDoMagento.push(item.product.sku); continue }

    const { price, table: usada, fallback } = priceFrom(book, table)
    if (fallback) resumo.semPrecoNaTabela.push(item.product.sku)

    const { subtotal, margin } = itemMath(price, Number(item.cost), item.quantity, Number(item.discount))
    ops.push(prisma.proposalItem.update({
      where: { id: item.id },
      data: {
        unitPrice: new Decimal(price),
        subtotal: new Decimal(subtotal),
        margin: new Decimal(margin),
        priceTable: usada,
        pricedAt: agora,
      },
    }))

    // Aproveita a consulta para renovar o cache de preços do catálogo.
    const attrs = (item.product.attributes ?? {}) as Record<string, unknown>
    ops.push(prisma.product.update({
      where: { id: item.productId },
      data: { attributes: { ...attrs, magento_price: book.list, tierPrices: book.tiers } },
    }))
    resumo.atualizados++
  }

  ops.push(prisma.proposal.update({ where: { id: params.id }, data: { priceTable: table } }))
  await prisma.$transaction(ops)
  await recalcProposal(params.id)

  return NextResponse.json({ priceTable: table, pricedAt: agora, ...resumo })
}
