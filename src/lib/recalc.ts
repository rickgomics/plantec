import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/prisma'
import { itensDaProposta } from '@/lib/services'

/** Totais da proposta a partir dos itens. Sempre no servidor. */
export async function recalcProposal(proposalId: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { includeServices: true, discount: true, items: { include: { product: true } } },
  })
  if (!proposal) return
  const items = itensDaProposta(proposal.items, proposal.includeServices)
  // Mesma conta da tela (computeTotals): desconto de cada item e, por cima, o
  // desconto global. Antes o global ficava de fora aqui, e mexer num item
  // gravava o total sem ele (lista de propostas e painel mostravam outro valor).
  const bruto = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0)
  const descItens = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity * (Number(i.discount) / 100), 0)
  const descGlobal = (bruto - descItens) * Number(proposal.discount) / 100
  const totalDiscount = descItens + descGlobal
  const totalPrice = bruto - totalDiscount
  const totalCost = items.reduce((s, i) => s + Number(i.cost) * i.quantity, 0)
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
