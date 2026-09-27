/**
 * Diagrama de topologia desenhado pelo próprio app.
 *
 * A IA descreve a topologia como dados (grupos, nós, ligações) e este módulo
 * faz o desenho em SVG, com as cores da Plantec e os nomes reais da BOM. Antes
 * eram dois motores externos (Mermaid via mermaid.ink e Eraser), com visuais
 * diferentes, timeout de rede no meio do PDF e código gerado que às vezes não
 * compilava.
 *
 * Layout em faixas: cada grupo é uma faixa horizontal, de cima (origem externa)
 * para baixo (pontas), com até 4 nós por linha — cabe na página A4 em pé sem
 * encolher o texto. Ligações são curvas da borda de um nó à do outro. Função
 * pura: o mesmo SVG serve à tela e ao PDF.
 */

export type TipoNo = 'proposto' | 'existente' | 'externo'

export interface Topologia {
  grupos: { id: string; titulo: string }[]
  nos: { id: string; rotulo: string; detalhe?: string; quantidade?: number; grupo: string; tipo: TipoNo }[]
  ligacoes: { de: string; para: string; rotulo?: string }[]
}

/** Schema para a resposta da IA (structured outputs). */
export const SCHEMA_TOPOLOGIA = {
  type: 'object',
  additionalProperties: false,
  required: ['grupos', 'nos', 'ligacoes'],
  description: 'Topologia da solução para o diagrama. Grupos em faixas, de cima (internet e sistemas externos) para baixo (pontas: câmeras, leitores, portas). De 3 a 6 grupos, até 16 nós, até 4 nós por grupo. Licenças e serviços NÃO viram nós: cite-os no detalhe do nó de software ou servidor. Acessórios pequenos do mesmo ponto (fechadura, mola, acionador) viram um nó só.',
  properties: {
    grupos: {
      type: 'array',
      description: 'Faixas do diagrama, na ordem de cima para baixo. Ex.: Internet e acesso remoto; Núcleo de rede; Gravação e software; Câmeras; Controle de acesso.',
      items: {
        type: 'object', additionalProperties: false, required: ['id', 'titulo'],
        properties: { id: { type: 'string' }, titulo: { type: 'string', description: 'Até 24 caracteres' } },
      },
    },
    nos: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['id', 'rotulo', 'grupo', 'tipo'],
        properties: {
          id: { type: 'string' },
          rotulo: { type: 'string', description: 'Nome curto do equipamento ou sistema, até 28 caracteres. Ex.: "Dome VIP 1230 D FC+"' },
          detalhe: { type: 'string', description: 'Uma característica útil, até 30 caracteres. Ex.: "48 canais IP"' },
          quantidade: { type: 'integer', description: 'Quantidade na BOM, quando for item da BOM' },
          grupo: { type: 'string', description: 'id do grupo' },
          tipo: { type: 'string', enum: ['proposto', 'existente', 'externo'], description: 'proposto = item da BOM; existente = já está no cliente (brief); externo = necessário e fora da proposta (switch PoE, link, servidor)' },
        },
      },
    },
    ligacoes: {
      type: 'array',
      description: 'Conexões físicas ou lógicas relevantes; até 18. Não repita a mesma ligação para cada nó de um grupo quando uma só representa o fluxo.',
      items: {
        type: 'object', additionalProperties: false, required: ['de', 'para'],
        properties: {
          de: { type: 'string' }, para: { type: 'string' },
          rotulo: { type: 'string', description: 'Tipo de ligação, até 14 caracteres: PoE, IP/LAN, Fibra, VPN, RS-485, Wiegand' },
        },
      },
    },
  },
} as const

/** Lê o JSON guardado em `scenarioDiagram`; null se não for uma topologia. */
export function lerTopologia(raw: string | null | undefined): Topologia | null {
  if (!raw?.trim().startsWith('{')) return null
  try {
    const t = JSON.parse(raw) as Topologia
    return Array.isArray(t?.grupos) && Array.isArray(t?.nos) && Array.isArray(t?.ligacoes) ? t : null
  } catch {
    return null
  }
}

// ── Desenho ───────────────────────────────────────────────────────────────────

const LARGURA = 680      // largura útil da página A4
const CALHA = 30         // faixa livre à esquerda por onde descem as ligações longas
const NODE_W_MAX = 290
const NODE_H = 50
const NODE_GAP_X = 12
const NODE_GAP_Y = 12
const ROW_GAP = 40
const GRP_PAD = 11
const GRP_TOP = 30
const POR_LINHA = 4

const CORES: Record<TipoNo, { fill: string; stroke: string; text: string; sub: string; dash?: string }> = {
  proposto:  { fill: '#E0F3F1', stroke: '#0B8F88', text: '#04322F', sub: '#0B6F6A' },
  existente: { fill: '#FFF7ED', stroke: '#EA580C', text: '#431407', sub: '#9A3412' },
  externo:   { fill: '#FFFFFF', stroke: '#94A3B8', text: '#334155', sub: '#64748B', dash: '5 4' },
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Quebra em até `max` linhas de ~`largura` caracteres, com reticências no fim. */
function linhas(texto: string, largura: number, max: number): string[] {
  const palavras = texto.trim().split(/\s+/)
  const out: string[] = []
  let atual = ''
  for (const p of palavras) {
    if ((atual + ' ' + p).trim().length <= largura) atual = (atual + ' ' + p).trim()
    else { if (atual) out.push(atual); atual = p }
  }
  if (atual) out.push(atual)
  if (out.length > max) {
    const cortadas = out.slice(0, max)
    cortadas[max - 1] = cortadas[max - 1].slice(0, largura - 1).replace(/\s+\S*$/, '') + '…'
    return cortadas
  }
  return out.map(l => (l.length > largura ? l.slice(0, largura - 1) + '…' : l))
}

interface Caixa { x: number; y: number; w: number; h: number; faixa: number }
interface Faixa { y: number; h: number }

export function renderTopologiaSvg(t: Topologia): string {
  // Grupos na ordem dada; nó com grupo desconhecido vai para o último.
  const grupos = t.grupos.filter(g => t.nos.some(n => n.grupo === g.id))
  const ids = new Set(grupos.map(g => g.id))
  const ultimo = grupos[grupos.length - 1]?.id
  const nos = t.nos.map(n => (ids.has(n.grupo) ? n : { ...n, grupo: ultimo ?? n.grupo }))
  if (!grupos.length && nos.length) grupos.push({ id: nos[0].grupo, titulo: '' })

  const caixas = new Map<string, Caixa>()
  const faixas: Faixa[] = []
  const partes: string[] = []
  const xFaixa = CALHA
  const wFaixa = LARGURA - CALHA
  const wUtil = wFaixa - 2 * GRP_PAD
  let y = 0

  grupos.forEach((g, faixa) => {
    const membros = nos.filter(n => n.grupo === g.id)
    const linhasN = Math.ceil(membros.length / POR_LINHA)
    const h = GRP_TOP + linhasN * NODE_H + (linhasN - 1) * NODE_GAP_Y + GRP_PAD
    faixas.push({ y, h })
    partes.push(
      `<rect x="${xFaixa}" y="${y}" width="${wFaixa}" height="${h}" rx="12" fill="#F8FAFC" stroke="#E2E8F0"/>`,
      `<text x="${xFaixa + 12}" y="${y + 19}" font-size="9.5" font-weight="700" letter-spacing="0.6" fill="#0B6F6A">${esc(g.titulo.toUpperCase())}</text>`,
    )
    membros.forEach((n, i) => {
      const lin = Math.floor(i / POR_LINHA)
      const naLinha = Math.min(POR_LINHA, membros.length - lin * POR_LINHA)
      const w = Math.min(NODE_W_MAX, (wUtil - (naLinha - 1) * NODE_GAP_X) / naLinha)
      const larguraLinha = naLinha * w + (naLinha - 1) * NODE_GAP_X
      caixas.set(n.id, {
        x: xFaixa + GRP_PAD + (wUtil - larguraLinha) / 2 + (i % POR_LINHA) * (w + NODE_GAP_X),
        y: y + GRP_TOP + lin * (NODE_H + NODE_GAP_Y),
        w, h: NODE_H, faixa,
      })
    })
    y += h + ROW_GAP
  })
  const altura = Math.max(y - ROW_GAP, NODE_H)

  // Ligações (antes dos nós). Entre faixas vizinhas: curva direta pelo vão.
  // Pulando faixas: sai pelo vão de baixo da origem, desce pela calha da
  // esquerda e entra pelo vão de cima do destino — nunca cruza uma caixa.
  // Rótulo repetido entre as mesmas faixas aparece uma vez só.
  const rotulos: string[] = []
  const rotuloVisto = new Set<string>()
  const rotulo = (r: string | undefined, mx: number, my: number, chave: string) => {
    const txt = r?.trim().slice(0, 14)
    if (!txt || rotuloVisto.has(chave + txt)) return
    rotuloVisto.add(chave + txt)
    const w = txt.length * 5.4 + 12
    rotulos.push(
      `<rect x="${mx - w / 2}" y="${my - 8}" width="${w}" height="16" rx="8" fill="#FFFFFF" stroke="#CBD5E1"/>`,
      `<text x="${mx}" y="${my + 3.5}" text-anchor="middle" font-size="8.5" font-weight="600" fill="#475569">${esc(txt)}</text>`,
    )
  }
  const seta = (d: string) => partes.push(`<path d="${d}" fill="none" stroke="#0B8F88" stroke-opacity="0.55" stroke-width="1.4" stroke-linejoin="round" marker-end="url(#seta)"/>`)
  let pista = 0

  for (const l of t.ligacoes) {
    const a = caixas.get(l.de), b = caixas.get(l.para)
    if (!a || !b || a === b) continue
    const ax = a.x + a.w / 2, bx = b.x + b.w / 2
    const salto = Math.abs(a.faixa - b.faixa)

    if (salto === 0) {
      const vizinhos = a.y === b.y && Math.abs(a.x - b.x) <= a.w + NODE_GAP_X + 1
      if (vizinhos) {
        const esq = a.x < b.x
        const x1 = esq ? a.x + a.w : a.x, x2 = esq ? b.x : b.x + b.w, yy = a.y + a.h / 2
        // vão de 12 px: rótulo não cabe sem cobrir o texto das caixas
        seta(`M${x1},${yy} L${x2},${yy}`)
      } else {
        const yArco = faixas[a.faixa].y + GRP_TOP - 6
        seta(`M${ax},${a.y} C${ax},${yArco - 10} ${bx},${yArco - 10} ${bx},${b.y}`)
        rotulo(l.rotulo, (ax + bx) / 2, yArco - 8, `${a.faixa}-${b.faixa}-`)
      }
    } else if (salto === 1) {
      const desce = a.faixa < b.faixa
      const y1 = desce ? a.y + a.h : a.y, y2 = desce ? b.y : b.y + b.h
      const vao = desce ? faixas[a.faixa].y + faixas[a.faixa].h + ROW_GAP / 2 : faixas[b.faixa].y + faixas[b.faixa].h + ROW_GAP / 2
      seta(`M${ax},${y1} C${ax},${vao} ${bx},${vao} ${bx},${y2}`)
      rotulo(l.rotulo, (ax + bx) / 2, vao, `${Math.min(a.faixa, b.faixa)}-${Math.max(a.faixa, b.faixa)}-`)
    } else {
      const desce = a.faixa < b.faixa
      const faixaA = faixas[a.faixa], faixaB = faixas[b.faixa]
      const k = pista++ % 5
      const xc = 5 + k * 5
      const y1 = desce ? a.y + a.h : a.y
      const y2 = desce ? b.y : b.y + b.h
      const vaoA = desce ? faixaA.y + faixaA.h + 10 + (k % 3) * 7 : faixaA.y - 10 - (k % 3) * 7
      const vaoB = desce ? faixaB.y - 10 - (k % 3) * 7 : faixaB.y + faixaB.h + 10 + (k % 3) * 7
      const r = 6
      const sy = desce ? 1 : -1
      seta([
        `M${ax},${y1}`,
        `L${ax},${vaoA - sy * r}`, `Q${ax},${vaoA} ${ax - r},${vaoA}`,
        `L${xc + r},${vaoA}`, `Q${xc},${vaoA} ${xc},${vaoA + sy * r}`,
        `L${xc},${vaoB - sy * r}`, `Q${xc},${vaoB} ${xc + r},${vaoB}`,
        `L${bx - r},${vaoB}`, `Q${bx},${vaoB} ${bx},${vaoB + sy * r}`,
        `L${bx},${y2}`,
      ].join(' '))
      // várias chegam pela calha no mesmo vão: um rótulo por faixa de destino
      rotulo(l.rotulo, Math.max(xc + 40, (xc + bx) / 2), vaoB, `chega-${b.faixa}-`)
    }
  }

  // Nós.
  for (const n of nos) {
    const c = caixas.get(n.id)
    if (!c) continue
    const cor = CORES[n.tipo] ?? CORES.proposto
    const qtd = n.quantidade && n.quantidade > 1 ? `×${n.quantidade}` : ''
    const larguraTexto = Math.floor((c.w - 20 - (qtd ? 44 : 0)) / 6.1)
    const nome = linhas(n.rotulo, larguraTexto, n.detalhe ? 1 : 2)
    const yTexto = c.y + (n.detalhe ? 20 : nome.length === 1 ? 29 : 22)
    partes.push(
      `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="9" fill="${cor.fill}" stroke="${cor.stroke}" stroke-width="1.3"${cor.dash ? ` stroke-dasharray="${cor.dash}"` : ''}/>`,
      ...nome.map((l, i) => `<text x="${c.x + 10}" y="${yTexto + i * 13}" font-size="10" font-weight="700" fill="${cor.text}">${esc(l)}</text>`),
    )
    if (n.detalhe) {
      partes.push(`<text x="${c.x + 10}" y="${c.y + 36}" font-size="8.5" fill="${cor.sub}">${esc(linhas(n.detalhe, Math.floor((c.w - 20) / 5.3), 1)[0] ?? '')}</text>`)
    }
    if (qtd) {
      const w = qtd.length * 6.2 + 10
      partes.push(
        `<rect x="${c.x + c.w - w - 6}" y="${c.y + 7}" width="${w}" height="16" rx="8" fill="${cor.stroke}"/>`,
        `<text x="${c.x + c.w - w / 2 - 6}" y="${c.y + 18.5}" text-anchor="middle" font-size="9" font-weight="700" fill="#FFFFFF">${qtd}</text>`,
      )
    }
  }

  const pad = 8
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${LARGURA + 2 * pad} ${altura + 2 * pad}" width="100%" preserveAspectRatio="xMidYMid meet" font-family="'Work Sans', Arial, sans-serif" role="img" aria-label="Diagrama de topologia">
<defs><marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" fill="#0B8F88" fill-opacity="0.8"/></marker></defs>
${partes.join('\n')}
${rotulos.join('\n')}
</svg>`
}
