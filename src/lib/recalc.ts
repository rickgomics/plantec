import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/prisma'

/** Totais da proposta a partir dos itens. Sempre no servidor. */
export async function recalcProposal(proposalId: string) {
  const items = await prisma.proposalItem.findMany({ where: { proposalId } })
  const totalPrice = items.reduce((s, i) => s + Number(i.subtotal), 0)
  const totalCost = items.reduce((s, i) => s + Number(i.cost) * i.quantity, 0)
  const totalDiscount = items.reduce(
    (s, i) => s + Number(i.unitPrice) * i.quantity * (Number(i.discount) / 100),
    0,
  )
  const margin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0
  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      totalPrice: new Decimal(totalPrice),
      totalCost: new Decimal(totalCost),
      totalDiscount: new Decimal(totalDiscount),
      margin: new Decimal(margin),
    },
  })
}

/** Subtotal e margem de um item. */
export function itemMath(unitPrice: number, cost: number, quantity: number, discount: number) {
  const subtotal = unitPrice * quantity - unitPrice * quantity * (discount / 100)
  const margin = subtotal > 0 ? ((subtotal - cost * quantity) / subtotal) * 100 : 0
  return { subtotal, margin }
}
