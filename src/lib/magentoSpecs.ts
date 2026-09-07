/**
 * Ficha técnica vinda dos attribute sets do Magento.
 *
 * O catálogo da loja separa os produtos em attribute sets — Câmeras (26),
 * Gravadores (29), Switches (32) — e cada um carrega os campos técnicos que o
 * sync antigo descartava, guardando só ncm/imagem/preço. São esses campos que
 * permitem dimensionar armazenamento, banda e licença sem pedir nada ao
 * consultor.
 *
 * Atributos `select` chegam como ID de opção ('1948'), não como rótulo ('128').
 * Por isso todo código select precisa do mapa de opções, buscado uma vez por
 * execução e reaproveitado (`fetchSpecOptionMaps`).
 */

type SpecKind = 'text' | 'select' | 'boolean'

interface SpecDef {
  /** Chave legível gravada em `attributes.specs` */
  key: string
  label: string
  kind: SpecKind
  /** Se definido, o número extraído do rótulo também vai para `attributes[<numeric>]` */
  numeric?: string
}

/** Códigos do Magento → ficha normalizada. Só o que tem uso técnico real. */
export const SPEC_DEFS: Record<string, SpecDef> = {
  // ── Gravadores (set 29) ────────────────────────────────────────────────
  quantidade_de_canais:           { key: 'canais',            label: 'Quantidade de canais',       kind: 'select',  numeric: 'channels' },
  quantidade_de_hds_plantec:      { key: 'baias',             label: 'HDs suportados',             kind: 'select',  numeric: 'hdBays' },
  // O código diz "por_hd", mas o valor é a capacidade TOTAL do gravador:
  // 128 canais / 8 baias → "112 TB" (14 TB por baia). Conferido no catálogo.
  gravadores_capacidade_max_gb_p: { key: 'capacidadeMaxima',  label: 'Capacidade máxima total',    kind: 'select',  numeric: 'maxStorageTb' },
  capacidade_de_armazenagem:      { key: 'armazenamento',     label: 'Armazenamento',              kind: 'select' },
  compatibilidade_ssd:            { key: 'ssd',               label: 'Compatibilidade SSD',        kind: 'select' },

  // ── Câmeras (set 26) ───────────────────────────────────────────────────
  resolucao_de_video:             { key: 'resolucao',         label: 'Resolução de vídeo',         kind: 'select',  numeric: 'resolutionMp' },
  tamanho_da_lente:               { key: 'lente',             label: 'Tamanho da lente',           kind: 'select' },
  angulo_de_visao:                { key: 'anguloDeVisao',     label: 'Ângulo de visão',            kind: 'text' },
  sensor_de_imagem:               { key: 'sensor',            label: 'Sensor de imagem',           kind: 'select' },
  visao_noturna:                  { key: 'visaoNoturna',      label: 'Visão noturna',              kind: 'select' },
  grau_de_protecao:               { key: 'grauDeProtecao',    label: 'Grau de proteção',           kind: 'select' },
  alimentacao_de_entrada:         { key: 'alimentacao',       label: 'Alimentação de entrada',     kind: 'select' },
  zoom_cameras:                   { key: 'zoom',              label: 'Zoom',                       kind: 'select' },
  tipo_de_case_camera:            { key: 'tipoDeCase',        label: 'Tipo de case',               kind: 'select' },
  local_de_instalacao:            { key: 'localDeInstalacao', label: 'Local de instalação',        kind: 'select' },
  modelo_da_camera:               { key: 'modelo',            label: 'Modelo da câmera',           kind: 'select' },
  smart_camera:                   { key: 'smart',             label: 'Smart',                      kind: 'boolean' },
  funcao_starlight:               { key: 'starlight',         label: 'Função Starlight',           kind: 'boolean' },
  microfone_embutido_camera:      { key: 'microfoneEmbutido', label: 'Microfone embutido',         kind: 'boolean' },
  conexao_wifi:                   { key: 'wifi',              label: 'Conexão WiFi',               kind: 'select' },

  // ── Switches (set 32) ──────────────────────────────────────────────────
  quantidade_de_portas:           { key: 'portas',            label: 'Quantidade de portas',       kind: 'select',  numeric: 'ports' },
  portas_uplink:                  { key: 'portasUplink',      label: 'Portas uplink',              kind: 'select' },
  rede_ethernet:                  { key: 'redeEthernet',      label: 'Rede Ethernet',              kind: 'select' },
  portas_poe:                     { key: 'poe',               label: 'Portas PoE',                 kind: 'boolean' },
  switch_gerenciavel:             { key: 'gerenciavel',       label: 'Gerenciável',                kind: 'boolean' },

  // ── Comum a câmeras e gravadores ───────────────────────────────────────
  protocolo_de_video:             { key: 'protocoloDeVideo',  label: 'Protocolo de vídeo',         kind: 'select' },
  // Textarea livre. É o gatilho de LGPD: costuma citar reconhecimento facial,
  // contagem de pessoas e mapa de calor nominalmente.
  inteligencia_de_video:          { key: 'inteligenciaDeVideo', label: 'Inteligência de vídeo',    kind: 'text' },
  analise_de_video:               { key: 'analiseDeVideo',    label: 'Análise de vídeo',           kind: 'text' },
}

export type SpecOptionMaps = Record<string, Record<string, string>>

/** Códigos que precisam de resolução de opção. */
export function specSelectCodes(): string[] {
  return Object.entries(SPEC_DEFS)
    .filter(([, d]) => d.kind === 'select')
    .map(([code]) => code)
}

/**
 * Busca os rótulos das opções de todos os atributos select da ficha.
 * Falha de um código não derruba os demais — o campo simplesmente não é gravado.
 */
export async function fetchSpecOptionMaps(
  base: string,
  headers: Record<string, string>,
): Promise<SpecOptionMaps> {
  const codes = specSelectCodes()
  const maps: SpecOptionMaps = {}

  await Promise.all(
    codes.map(async code => {
      try {
        const res = await fetch(`${base}/rest/V1/products/attributes/${code}/options`, {
          headers, signal: AbortSignal.timeout(10_000),
        })
        if (!res.ok) return
        const opts = (await res.json()) as { value?: string; label?: string }[]
        const m: Record<string, string> = {}
        for (const o of opts) if (o.value && o.label) m[o.value] = o.label
        maps[code] = m
      } catch {
        /* atributo indisponível — segue sem ele */
      }
    }),
  )

  return maps
}

/** Primeiro número do rótulo: "128" → 128, "112 TB" → 112, "4MP (2304x1296)" → 4 */
function firstNumber(label: string): number | null {
  const m = label.replace(',', '.').match(/\d+(?:\.\d+)?/)
  if (!m) return null
  const n = Number(m[0])
  return Number.isFinite(n) ? n : null
}

export interface ExtractedSpecs {
  /** Ficha legível, pronta para exibir: { canais: '128', baias: '8', ... } */
  specs: Record<string, string>
  /** Números derivados, prontos para cálculo: { channels: 128, hdBays: 8, ... } */
  numbers: Record<string, number>
}

/**
 * Lê os `custom_attributes` de um produto do Magento e devolve a ficha técnica.
 * Valores vazios, '0' de boolean e opções não resolvidas são descartados —
 * um campo ausente tem que continuar ausente, nunca virar zero.
 */
export function extractSpecs(
  customAttributes: { attribute_code: string; value: unknown }[] | undefined,
  optionMaps: SpecOptionMaps,
): ExtractedSpecs {
  const specs: Record<string, string> = {}
  const numbers: Record<string, number> = {}
  if (!customAttributes?.length) return { specs, numbers }

  for (const attribute of customAttributes) {
    const def = SPEC_DEFS[attribute.attribute_code]
    if (!def) continue

    const raw = attribute.value
    if (raw === null || raw === undefined || raw === '') continue

    let label: string

    if (def.kind === 'boolean') {
      // Magento devolve '1' / '0'. Só o positivo entra na ficha.
      if (String(raw) !== '1') continue
      label = 'Sim'
    } else if (def.kind === 'select') {
      const resolved = optionMaps[attribute.attribute_code]?.[String(raw)]
      // Sem mapa de opções o valor é um ID sem significado — melhor omitir.
      if (!resolved) continue
      label = resolved
    } else {
      label = String(raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (!label) continue
    }

    specs[def.key] = label

    if (def.numeric) {
      const n = firstNumber(label)
      if (n !== null && n > 0) numbers[def.numeric] = n
    }
  }

  return { specs, numbers }
}

/**
 * Bloco pronto para mesclar em `Product.attributes`. Devolve `{}` quando o
 * produto não tem ficha — assim não polui o catálogo comercial com chaves vazias.
 */
export function buildSpecAttributes(
  customAttributes: { attribute_code: string; value: unknown }[] | undefined,
  optionMaps: SpecOptionMaps,
): Record<string, unknown> {
  const { specs, numbers } = extractSpecs(customAttributes, optionMaps)
  if (!Object.keys(specs).length) return {}
  return { specs, ...numbers }
}
