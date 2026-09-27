/**
 * Marca do produto a partir do fabricante do Magento.
 *
 * Antes o sync gravava a PRIMEIRA palavra do rótulo em caixa de título:
 * "WJ - RACKS" virava "Wj", "GP CABOS" virava "Gp", "PIAL-LEGRAND" e
 * "PIAL PLUS +" ficavam como marcas diferentes de "LEGRAND", e as 9 divisões
 * da Intelbras só se juntavam por acaso. Além disso a loja tem 129 produtos
 * Intelbras com fabricante "PLANTEC" e 46 com "N/D": para esses a marca sai do
 * fim do nome ("NOBREAK ... - INTELBRAS").
 */
import { normalizar } from './taxonomy'

/** Rótulo do Magento (normalizado) → marca. `null` = rótulo que não diz a marca. */
const ALIASES: Record<string, string | null> = {
  'INTELBRAS - GENETEC': 'Intelbras',
  'INTELBRAS COMUNICACAO': 'Intelbras',
  'INTELBRAS CONSUMO': 'Intelbras',
  'INTELBRAS CONTR ACESSO': 'Intelbras',
  'INTELBRAS ENERGIA': 'Intelbras',
  'INTELBRAS INCENDIO ILUM': 'Intelbras',
  'INTELBRAS REDES': 'Intelbras',
  'INTELBRAS SEG ELETRONICA': 'Intelbras',
  'INTELBRAS SOLAR': 'Intelbras',
  'ISEC - INTELBRAS ALARMES': 'Intelbras',
  'ISEC - INTELBRAS CFTV IP': 'Intelbras',
  'ISOL-INTELBRAS SOLUCOES': 'Intelbras',
  'PIAL PLUS +': 'Legrand',
  'PIAL-LEGRAND': 'Legrand',
  'CEMAR LEGRAND': 'Legrand',
  'SMS LEGRAND': 'Legrand',
  'LEGRAND': 'Legrand',
  'HDL - INTERFONIA CONDOMINIAL': 'HDL',
  'HDL - INTERFONIA RESIDENCIAL': 'HDL',
  'HDL CFTV': 'HDL',
  'HDL CFTV IP': 'HDL',
  'KHOMP CONTR ACESSO': 'Khomp',
  'KHOMP - COMUNICACAO': 'Khomp',
  'GP CONTROL': 'GP Control',
  'GPCONTROL': 'GP Control',
  'GP CABOS': 'GP Cabos',
  'SIL FIOS E CABOS': 'SIL',
  'WJ - RACKS': 'WJ',
  'SCHNEIDER ELECTRIC': 'Schneider Electric',
  'WESTERN DIGITAL': 'Western Digital',
  'LG - SECURITY': 'LG',
  'LS METAL NOBRE': 'Metal Nobre',
  'METAL NOBRE': 'Metal Nobre',
  'BUFALLO INOX': 'Buffalo',
  'SDC - SERVIDORES': 'SDC',
  'ICON - INTERFONIA RESIDENCIAL': 'Icon',
  'BLACK + DECKER': 'Black+Decker',
  'DLINK': 'D-Link',
  'MAXIPRO': 'MaxiPró',
  'N/D - NETWORK': null,
  'N/D - TELECOM': null,
  'N/D SECURITY': null,
  'BLACK FRIDAY': null,
  'PLANTEC': null,
}

/** Primeira palavra que aparece no fim dos nomes → marca (para o fallback pelo nome). */
const PELO_NOME: Record<string, string> = {
  INTELBRAS: 'Intelbras', SCHNEIDER: 'Schneider Electric', LEGRAND: 'Legrand', PIAL: 'Legrand',
  COMMSCOPE: 'Commscope', AMP: 'Commscope', FURUKAWA: 'Furukawa', NEXANS: 'Nexans', HIKVISION: 'Hikvision',
  SEAGATE: 'Seagate', WESTERN: 'Western Digital', KHOMP: 'Khomp', FANVIL: 'Fanvil', MIKROTIK: 'Mikrotik',
  FIBERHOME: 'Fiberhome', FIBRACEM: 'Fibracem', PRYSMIAN: 'Prysmian', DEMATEC: 'Dematec', WJ: 'WJ',
  DUTOPLAST: 'Dutoplast', CONDUTTI: 'Condutti', DANEVA: 'Daneva', STANLEY: 'Stanley', IRWIN: 'Irwin',
  '3M': '3M', BRADY: 'Brady', OSRAM: 'Osram', FASGOLD: 'Fasgold', SECCON: 'Seccon', SOLLAN: 'Sollan',
  HDL: 'HDL', ELSYS: 'Elsys', VOLT: 'Volt', SECPOWER: 'Secpower', CLAMPER: 'Clamper', STECK: 'Steck',
  LORENZETTI: 'Lorenzetti', DIGIFORT: 'Digifort', CONFISEG: 'Confiseg', PROTECTM: 'Protectm',
}

function titulo(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && /^(DO|DA|DE|DOS|DAS|E)$/i.test(w) ? w.toLowerCase()
      : w.length <= 3 || /\d/.test(w) ? w.toUpperCase()
      : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/** Marca citada no fim do nome do produto, se for uma que conhecemos. */
export function marcaPeloNome(name: string): string | null {
  const n = normalizar(name).trim()
  const depoisDoTraco = n.includes(' - ') ? n.slice(n.lastIndexOf(' - ') + 3) : ''
  const candidatos = [
    depoisDoTraco.split(/\s+/)[0],
    n.split(/\s+/).pop() ?? '',
  ]
  for (const c of candidatos) {
    const k = c.replace(/[^A-Z0-9]/g, '')
    if (k && PELO_NOME[k]) return PELO_NOME[k]
  }
  return null
}

/**
 * Marca canônica a partir do rótulo do fabricante e do nome. Rótulo que não
 * diz a marca (PLANTEC, N/D…) cai no nome; sem nada, fica "Plantec" apenas
 * se o rótulo era Plantec (serviços e produtos próprios).
 */
export function normalizarMarca(label: string | null | undefined, name: string): string | null {
  const raw = (label ?? '').trim()
  const key = normalizar(raw).replace(/\s+/g, ' ')
  if (raw && ALIASES[key] !== undefined && ALIASES[key] !== null) return ALIASES[key]
  if (raw && ALIASES[key] === undefined) return titulo(raw)
  return marcaPeloNome(name) ?? (key === 'PLANTEC' ? 'Plantec' : null)
}
