/** Serviço é produto da categoria "Serviços" (o catálogo tem também "Servicos", sem acento). */
export function isServico(product: { category: string }) {
  return product.category.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() === 'servicos'
}

/** Itens que entram nos totais e no PDF: com os serviços desligados, eles ficam
 *  guardados na BOM mas fora da proposta. */
export function itensDaProposta<T extends { product: { category: string } }>(
  items: T[],
  includeServices: boolean | null | undefined,
): T[] {
  return includeServices === false ? items.filter(i => !isServico(i.product)) : items
}
