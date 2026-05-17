import { ProposalItem, Rule, RuleEngineResult, RuleAlert } from '@/types'

export function evaluateRules(
  items: ProposalItem[],
  rules: Rule[],
  globalDiscount: number = 0
): RuleEngineResult {
  const result: RuleEngineResult = {
    alerts: [],
    errors: [],
    suggestions: [],
    requiredMissing: [],
    isBlocked: false,
  }

  if (items.length === 0) return result

  const itemSkus = new Set(items.map(i => i.product.sku))
  const totalPrice = items.reduce((sum, i) => sum + i.subtotal, 0)
  const totalCost = items.reduce((sum, i) => sum + Number(i.cost) * i.quantity, 0)
  const margin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0

  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority)

  for (const rule of sortedRules) {
    if (!rule.active) continue
    const cond = rule.condition as Record<string, unknown>
    const action = rule.action as Record<string, unknown>

    let conditionMet = false

    // Check category-based condition
    if (cond.category) {
      const categoryItems = items.filter(i => i.product.category === cond.category)

      if (categoryItems.length > 0) {
        if (cond.attribute && cond.value) {
          // Check attribute value
          const matchingItems = categoryItems.filter(i => {
            const attrs = i.product.attributes as Record<string, unknown>
            return attrs[cond.attribute as string] === cond.value
          })
          conditionMet = matchingItems.length > 0
        } else if (cond.subcategory) {
          const subcatItems = categoryItems.filter(
            i => i.product.subcategory === cond.subcategory
          )
          if (cond.quantityGt !== undefined) {
            const totalQty = subcatItems.reduce((sum, i) => sum + i.quantity, 0)
            conditionMet = totalQty > (cond.quantityGt as number)
          } else {
            conditionMet = subcatItems.length > 0
          }
        } else {
          conditionMet = true
        }
      }
    }

    // Check margin condition
    if (cond.marginLt !== undefined) {
      conditionMet = margin < (cond.marginLt as number)
    }

    if (!conditionMet) continue

    const message = (action.message as string) || ''
    const skus = (action.skus as string[]) || []

    const alert: RuleAlert = {
      type: rule.type as RuleAlert['type'],
      severity: (action.severity as RuleAlert['severity']) || 'info',
      message,
      skus,
      ruleId: rule.id,
      ruleName: rule.name,
    }

    if (rule.type === 'suggestion') {
      // Only suggest if not already in BOM
      const notInBOM = skus.filter(sku => !itemSkus.has(sku))
      if (notInBOM.length > 0) {
        result.suggestions.push({ ...alert, skus: notInBOM })
      }
    } else if (rule.type === 'required') {
      const missing = skus.filter(sku => !itemSkus.has(sku))
      if (missing.length > 0) {
        const reqAlert = { ...alert, severity: 'error' as const, skus: missing }
        result.requiredMissing.push(reqAlert)
        result.errors.push(reqAlert)
        result.isBlocked = true
      }
    } else if (rule.type === 'alert') {
      alert.severity = (action.severity as RuleAlert['severity']) || 'warning'
      result.alerts.push(alert)
    } else if (rule.type === 'error') {
      alert.severity = 'error'
      result.errors.push(alert)
      result.isBlocked = true
    }
  }

  return result
}

export function calculateProposalTotals(
  items: ProposalItem[],
  globalDiscount: number = 0
) {
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const itemDiscounts = items.reduce(
    (sum, i) => sum + (i.unitPrice * i.quantity * i.discount) / 100,
    0
  )
  const globalDiscountAmount =
    ((subtotal - itemDiscounts) * globalDiscount) / 100
  const totalDiscount = itemDiscounts + globalDiscountAmount
  const totalPrice = subtotal - totalDiscount
  const totalCost = items.reduce(
    (sum, i) => sum + Number(i.cost) * i.quantity,
    0
  )
  const margin =
    totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0

  return {
    subtotal,
    totalDiscount,
    totalPrice,
    totalCost,
    margin,
  }
}
