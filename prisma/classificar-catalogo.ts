/**
 * Classifica o catálogo pela taxonomia da Plantec (src/lib/taxonomy.ts).
 *
 *   npm run catalogo:classificar              → só relatório (padrão, não grava)
 *   npm run catalogo:classificar -- --apply   → grava
 *
 * Grava `attributes.classificacao` + `category`/`subcategory` dos produtos que
 * alguma regra pegou. Não mexe em quem já tem classificação manual ou por IA,
 * nem nos produtos de ficha manual (`specsManuais`), cuja categoria foi posta à
 * mão — esses recebem a classificação "manual" com a categoria que já têm.
 * O que nenhuma regra pega fica como está, para a etapa da IA.
 *
 * Também renomeia a subcategoria usada pelas regras do motor ("Cameras IP" →
 * "Câmeras IP"), que hoje quase nunca disparam porque 99% dos produtos estão
 * sem subcategoria.
 *
 * O relatório completo sai em CSV (caminho no fim da saída).
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { writeFileSync } from 'fs'
import {
  classificarPorRegra, classificacaoGuardada, CATEGORY_NAMES, type Classificacao,
} from '../src/lib/taxonomy'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const CSV = process.env.CLASSIFICAR_CSV ?? '/tmp/classificacao-catalogo.csv'

const RULE_SUB_RENAMES: Record<string, string> = { 'Cameras IP': 'Câmeras IP' }

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, brand: true, category: true, subcategory: true, attributes: true },
    orderBy: { sku: 'asc' },
  })

  const agora = new Date().toISOString()
  const plano: { id: string; attributes: Prisma.InputJsonValue; category: string; subcategory: string | null }[] = []
  const linhas: string[] = [['sku', 'nome', 'marca', 'categoria_atual', 'sub_atual', 'categoria_nova', 'sub_nova', 'fonte', 'regra'].join(',')]
  const porCategoria = new Map<string, number>()
  const porRegra = new Map<string, number>()
  let mantidas = 0, semRegra = 0, mudaCategoria = 0

  for (const p of products) {
    const attrs = (p.attributes ?? {}) as Record<string, unknown>
    let alvo: Classificacao | null = null
    const guardada = classificacaoGuardada(attrs)

    if (guardada && guardada.fonte !== 'regra') {
      alvo = guardada
      mantidas++
    } else if (attrs.specsManuais === true) {
      alvo = { category: p.category, subcategory: p.subcategory, fonte: 'manual', em: agora }
      mantidas++
    } else {
      const r = classificarPorRegra(p.name)
      if (r) {
        alvo = { ...r, em: agora }
        porRegra.set(r.regra!, (porRegra.get(r.regra!) ?? 0) + 1)
      } else {
        semRegra++
      }
    }

    const cat = alvo?.category ?? '(sem regra)'
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + 1)
    if (alvo && alvo.category !== p.category) mudaCategoria++

    linhas.push([
      p.sku, p.name, p.brand, p.category, p.subcategory,
      alvo?.category ?? '', alvo?.subcategory ?? '', alvo?.fonte ?? '', alvo?.regra ?? '',
    ].map(csvCell).join(','))

    if (alvo && (alvo.category !== p.category || alvo.subcategory !== p.subcategory || !guardada)) {
      plano.push({
        id: p.id,
        category: alvo.category,
        subcategory: alvo.subcategory,
        attributes: { ...attrs, classificacao: { ...alvo } } as Prisma.InputJsonValue,
      })
    }
  }

  writeFileSync(CSV, linhas.join('\n'))

  const total = products.length
  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`
  console.log(`Produtos: ${total}`)
  console.log(`  classificados por regra: ${total - semRegra - mantidas} (${pct(total - semRegra - mantidas)})`)
  console.log(`  mantidos (manual/ia/ficha manual): ${mantidas}`)
  console.log(`  sem regra (vão para a IA): ${semRegra} (${pct(semRegra)})`)
  console.log(`  mudam de categoria: ${mudaCategoria}`)
  console.log('\nPor categoria nova:')
  for (const [c, n] of Array.from(porCategoria).sort((a, b) => b[1] - a[1])) {
    const fora = c !== '(sem regra)' && !CATEGORY_NAMES.includes(c) ? '  ← fora da taxonomia' : ''
    console.log(`  ${String(n).padStart(5)}  ${c}${fora}`)
  }
  console.log('\nPor regra:')
  for (const [r, n] of Array.from(porRegra).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${r}`)
  console.log(`\nRelatório completo: ${CSV}`)

  const regras = await prisma.rule.findMany({ select: { id: true, name: true, condition: true } })
  const regrasRenomear = regras.filter(r => {
    const sub = (r.condition as { subcategory?: string })?.subcategory
    return sub && RULE_SUB_RENAMES[sub]
  })
  for (const r of regrasRenomear) {
    const sub = (r.condition as { subcategory: string }).subcategory
    console.log(`Regra do motor "${r.name}": subcategoria "${sub}" → "${RULE_SUB_RENAMES[sub]}"`)
  }

  if (!APPLY) {
    console.log(`\n--dry: nada gravado. ${plano.length} produtos e ${regrasRenomear.length} regras seriam atualizados.`)
    return
  }

  let feitos = 0
  for (let i = 0; i < plano.length; i += 200) {
    const lote = plano.slice(i, i + 200)
    await prisma.$transaction(lote.map(u => prisma.product.update({
      where: { id: u.id },
      data: { category: u.category, subcategory: u.subcategory, attributes: u.attributes },
    })))
    feitos += lote.length
    console.log(`  gravados ${feitos}/${plano.length}`)
  }
  for (const r of regrasRenomear) {
    const cond = r.condition as Record<string, unknown>
    await prisma.rule.update({
      where: { id: r.id },
      data: { condition: { ...cond, subcategory: RULE_SUB_RENAMES[cond.subcategory as string] } as Prisma.InputJsonValue },
    })
  }
  console.log(`Gravado: ${feitos} produtos, ${regrasRenomear.length} regras.`)
}

main()
  .catch(e => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
