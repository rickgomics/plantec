export type CoverStyleId =
  | 'teal' | 'carbon' | 'ocean' | 'burgundy' | 'pearl'
  | 'security' | 'networks' | 'access' | 'energy' | 'comms'

export interface CoverStyle {
  id: CoverStyleId
  name: string
  vertical?: string
  bg: string
  pattern: string
  decorationSvg?: string
  accent: string
  accentLight: string
  text: string
  subText: string
  footerBg: string
  dark: boolean
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const decoStyle = (extra = '') =>
  `position:absolute;pointer-events:none;z-index:0;${extra}`

// ─── themes ───────────────────────────────────────────────────────────────────
export const COVER_STYLES: CoverStyle[] = [

  // ── Clássicos ──────────────────────────────────────────────────────────────
  {
    id: 'teal',
    name: 'Emerald',
    bg: 'linear-gradient(160deg,#002827 0%,#004341 45%,#005F5C 100%)',
    pattern: '',
    accent: '#26A39F',
    accentLight: '#4DB4B2',
    text: '#ffffff',
    subText: 'rgba(255,255,255,0.6)',
    footerBg: 'rgba(0,0,0,0.25)',
    dark: true,
  },
  {
    id: 'carbon',
    name: 'Carbon',
    bg: 'linear-gradient(135deg,#0F172A 0%,#1E293B 60%,#334155 100%)',
    pattern: 'repeating-linear-gradient(45deg,transparent,transparent 28px,rgba(255,255,255,.03) 28px,rgba(255,255,255,.03) 29px)',
    accent: '#38BDF8',
    accentLight: '#7DD3FC',
    text: '#ffffff',
    subText: 'rgba(255,255,255,0.55)',
    footerBg: 'rgba(0,0,0,0.3)',
    dark: true,
  },
  {
    id: 'ocean',
    name: 'Ocean',
    bg: 'linear-gradient(160deg,#0C1A3C 0%,#1E3A8A 55%,#1D4ED8 100%)',
    pattern: 'radial-gradient(ellipse at 80% 20%,rgba(96,165,250,.18) 0%,transparent 55%),radial-gradient(ellipse at 10% 80%,rgba(30,58,138,.4) 0%,transparent 50%)',
    accent: '#60A5FA',
    accentLight: '#93C5FD',
    text: '#ffffff',
    subText: 'rgba(255,255,255,0.6)',
    footerBg: 'rgba(0,0,0,0.25)',
    dark: true,
  },
  {
    id: 'burgundy',
    name: 'Executive',
    bg: 'linear-gradient(160deg,#1A0A0A 0%,#450A0A 55%,#7F1D1D 100%)',
    pattern: 'repeating-linear-gradient(0deg,transparent,transparent 47px,rgba(252,165,165,.04) 47px,rgba(252,165,165,.04) 48px),repeating-linear-gradient(90deg,transparent,transparent 47px,rgba(252,165,165,.04) 47px,rgba(252,165,165,.04) 48px)',
    accent: '#FCA5A5',
    accentLight: '#FECACA',
    text: '#ffffff',
    subText: 'rgba(255,255,255,0.55)',
    footerBg: 'rgba(0,0,0,0.3)',
    dark: true,
  },
  {
    id: 'pearl',
    name: 'Pearl',
    bg: 'linear-gradient(160deg,#F8FAFC 0%,#F1F5F9 60%,#E2E8F0 100%)',
    pattern: '',
    accent: '#00928E',
    accentLight: '#26A39F',
    text: '#002827',
    subText: 'rgba(0,40,39,0.5)',
    footerBg: '#E6F5F4',
    dark: false,
  },

  // ── Verticais ──────────────────────────────────────────────────────────────

  // Segurança Eletrônica — dark slate + target/câmera
  {
    id: 'security',
    name: 'Segurança',
    vertical: 'Segurança Eletrônica',
    bg: 'linear-gradient(150deg,#0A0D1A 0%,#131B35 50%,#1A2744 100%)',
    pattern: 'radial-gradient(ellipse at 75% 20%,rgba(239,68,68,.16) 0%,transparent 50%),repeating-linear-gradient(135deg,transparent,transparent 30px,rgba(239,68,68,.025) 30px,rgba(239,68,68,.025) 31px)',
    accent: '#EF4444',
    accentLight: '#FCA5A5',
    text: '#ffffff',
    subText: 'rgba(255,255,255,0.55)',
    footerBg: 'rgba(0,0,0,0.35)',
    dark: true,
    decorationSvg: `<svg width="420" height="420" viewBox="0 0 420 420" fill="none" xmlns="http://www.w3.org/2000/svg" style="${decoStyle('right:-70px;bottom:-50px;opacity:0.09')}">
  <circle cx="210" cy="210" r="190" stroke="#EF4444" stroke-width="1.5"/>
  <circle cx="210" cy="210" r="150" stroke="#EF4444" stroke-width="1"/>
  <circle cx="210" cy="210" r="105" stroke="#EF4444" stroke-width="1"/>
  <circle cx="210" cy="210" r="65" stroke="#EF4444" stroke-width="1.5"/>
  <circle cx="210" cy="210" r="22" fill="#EF4444" fill-opacity="0.35"/>
  <circle cx="210" cy="210" r="8" fill="#EF4444"/>
  <line x1="20" y1="210" x2="400" y2="210" stroke="#EF4444" stroke-width="0.8"/>
  <line x1="210" y1="20" x2="210" y2="400" stroke="#EF4444" stroke-width="0.8"/>
  <line x1="75" y1="75" x2="345" y2="345" stroke="#EF4444" stroke-width="0.5"/>
  <line x1="345" y1="75" x2="75" y2="345" stroke="#EF4444" stroke-width="0.5"/>
  <path d="M150 50 L170 30 L180 50Z" fill="#EF4444" fill-opacity="0.4"/>
  <path d="M250 370 L270 390 L240 390Z" fill="#EF4444" fill-opacity="0.3"/>
</svg>`,
  },

  // Redes & Cabeamento — deep navy + topologia de nós
  {
    id: 'networks',
    name: 'Redes',
    vertical: 'Redes & Cabeamento',
    bg: 'linear-gradient(150deg,#070E1F 0%,#0D1F4A 50%,#0F2B6A 100%)',
    pattern: 'radial-gradient(circle at 15% 20%,rgba(6,182,212,.14) 0%,transparent 40%),repeating-linear-gradient(0deg,transparent,transparent 30px,rgba(6,182,212,.035) 30px,rgba(6,182,212,.035) 31px),repeating-linear-gradient(90deg,transparent,transparent 30px,rgba(6,182,212,.035) 30px,rgba(6,182,212,.035) 31px)',
    accent: '#06B6D4',
    accentLight: '#67E8F9',
    text: '#ffffff',
    subText: 'rgba(255,255,255,0.55)',
    footerBg: 'rgba(0,0,0,0.3)',
    dark: true,
    decorationSvg: `<svg width="440" height="420" viewBox="0 0 440 420" fill="none" xmlns="http://www.w3.org/2000/svg" style="${decoStyle('right:-60px;top:10px;opacity:0.1')}">
  <circle cx="220" cy="210" r="14" fill="#06B6D4"/>
  <circle cx="70" cy="80" r="8" fill="#06B6D4"/>
  <circle cx="370" cy="90" r="10" fill="#06B6D4"/>
  <circle cx="390" cy="280" r="8" fill="#06B6D4"/>
  <circle cx="200" cy="370" r="9" fill="#06B6D4"/>
  <circle cx="50" cy="300" r="7" fill="#06B6D4"/>
  <circle cx="330" cy="370" r="7" fill="#06B6D4"/>
  <circle cx="130" cy="350" r="5" fill="#06B6D4"/>
  <circle cx="420" cy="180" r="5" fill="#06B6D4"/>
  <circle cx="100" cy="160" r="5" fill="#06B6D4"/>
  <circle cx="310" cy="50" r="5" fill="#06B6D4"/>
  <line x1="220" y1="210" x2="70" y2="80" stroke="#06B6D4" stroke-width="1.5"/>
  <line x1="220" y1="210" x2="370" y2="90" stroke="#06B6D4" stroke-width="1.5"/>
  <line x1="220" y1="210" x2="390" y2="280" stroke="#06B6D4" stroke-width="1.5"/>
  <line x1="220" y1="210" x2="200" y2="370" stroke="#06B6D4" stroke-width="1.5"/>
  <line x1="220" y1="210" x2="50" y2="300" stroke="#06B6D4" stroke-width="1.5"/>
  <line x1="220" y1="210" x2="330" y2="370" stroke="#06B6D4" stroke-width="1.2"/>
  <line x1="70" y1="80" x2="310" y2="50" stroke="#06B6D4" stroke-width="1"/>
  <line x1="70" y1="80" x2="100" y2="160" stroke="#06B6D4" stroke-width="1"/>
  <line x1="370" y1="90" x2="310" y2="50" stroke="#06B6D4" stroke-width="1"/>
  <line x1="370" y1="90" x2="420" y2="180" stroke="#06B6D4" stroke-width="1"/>
  <line x1="390" y1="280" x2="420" y2="180" stroke="#06B6D4" stroke-width="0.8"/>
  <line x1="200" y1="370" x2="130" y2="350" stroke="#06B6D4" stroke-width="0.8"/>
  <line x1="50" y1="300" x2="130" y2="350" stroke="#06B6D4" stroke-width="0.8"/>
</svg>`,
  },

  // Controle de Acesso — dark green + arcos biométricos
  {
    id: 'access',
    name: 'Acesso',
    vertical: 'Controle de Acesso',
    bg: 'linear-gradient(150deg,#071410 0%,#0C2B1E 50%,#0F3B2A 100%)',
    pattern: 'radial-gradient(ellipse at 70% 50%,rgba(16,185,129,.14) 0%,transparent 45%),repeating-linear-gradient(45deg,transparent,transparent 22px,rgba(16,185,129,.025) 22px,rgba(16,185,129,.025) 23px)',
    accent: '#10B981',
    accentLight: '#6EE7B7',
    text: '#ffffff',
    subText: 'rgba(255,255,255,0.55)',
    footerBg: 'rgba(0,0,0,0.3)',
    dark: true,
    decorationSvg: `<svg width="340" height="460" viewBox="0 0 340 460" fill="none" xmlns="http://www.w3.org/2000/svg" style="${decoStyle('right:-30px;top:50%;transform:translateY(-50%);opacity:0.1')}">
  <circle cx="170" cy="230" r="8" fill="#10B981"/>
  <path d="M170 230 C115 195 95 155 112 108 C129 61 211 61 228 108 C245 155 225 195 170 230" stroke="#10B981" stroke-width="2.5" fill="none"/>
  <path d="M170 230 C95 183 65 130 90 75 C115 20 225 20 250 75 C275 130 245 183 170 230" stroke="#10B981" stroke-width="2" fill="none"/>
  <path d="M170 230 C70 170 32 105 65 42 C98 -20 242 -20 275 42 C308 105 270 170 170 230" stroke="#10B981" stroke-width="1.5" fill="none"/>
  <path d="M170 230 C40 155 -5 78 35 10 C75 -60 265 -60 305 10 C345 78 300 155 170 230" stroke="#10B981" stroke-width="1" fill="none"/>
  <path d="M170 230 C115 265 95 305 112 352 C129 399 211 399 228 352 C245 305 225 265 170 230" stroke="#10B981" stroke-width="2.5" fill="none"/>
  <path d="M170 230 C95 277 65 330 90 385 C115 440 225 440 250 385 C275 330 245 277 170 230" stroke="#10B981" stroke-width="2" fill="none"/>
  <path d="M170 230 C70 290 32 355 65 418 C98 481 242 481 275 418 C308 355 270 290 170 230" stroke="#10B981" stroke-width="1.5" fill="none"/>
  <path d="M170 230 C40 305 -5 382 35 450 C75 520 265 520 305 450 C345 382 300 305 170 230" stroke="#10B981" stroke-width="1" fill="none"/>
</svg>`,
  },

  // Energia — dark amber + raio
  {
    id: 'energy',
    name: 'Energia',
    vertical: 'Energia',
    bg: 'linear-gradient(150deg,#1C0900 0%,#4A1500 50%,#7C2D12 100%)',
    pattern: 'radial-gradient(ellipse at 80% 25%,rgba(249,115,22,.18) 0%,transparent 45%),repeating-linear-gradient(60deg,transparent,transparent 20px,rgba(249,115,22,.03) 20px,rgba(249,115,22,.03) 21px),repeating-linear-gradient(-60deg,transparent,transparent 20px,rgba(249,115,22,.03) 20px,rgba(249,115,22,.03) 21px)',
    accent: '#F97316',
    accentLight: '#FED7AA',
    text: '#ffffff',
    subText: 'rgba(255,255,255,0.55)',
    footerBg: 'rgba(0,0,0,0.35)',
    dark: true,
    decorationSvg: `<svg width="300" height="460" viewBox="0 0 300 460" fill="none" xmlns="http://www.w3.org/2000/svg" style="${decoStyle('right:-10px;top:50%;transform:translateY(-52%);opacity:0.1')}">
  <path d="M185 20 L75 240 L148 240 L115 440 L225 200 L150 200 L185 20Z" fill="#F97316" fill-opacity="0.25" stroke="#F97316" stroke-width="3" stroke-linejoin="round"/>
  <path d="M205 30 L95 250 L168 250 L135 450" stroke="#F97316" stroke-width="1" fill="none" stroke-opacity="0.4"/>
  <path d="M165 10 L55 230 L128 230 L95 430" stroke="#F97316" stroke-width="1" fill="none" stroke-opacity="0.3"/>
  <circle cx="148" cy="240" r="6" fill="#F97316" fill-opacity="0.6"/>
  <circle cx="185" cy="20" r="4" fill="#F97316" fill-opacity="0.5"/>
  <circle cx="115" cy="440" r="4" fill="#F97316" fill-opacity="0.5"/>
</svg>`,
  },

  // Comunicações — deep violet + ondas de sinal
  {
    id: 'comms',
    name: 'Comunicações',
    vertical: 'Comunicações',
    bg: 'linear-gradient(150deg,#0D0B1F 0%,#1E1B4B 50%,#2D1B69 100%)',
    pattern: 'radial-gradient(ellipse at 80% 50%,rgba(139,92,246,.2) 0%,transparent 45%),repeating-linear-gradient(0deg,transparent,transparent 24px,rgba(139,92,246,.03) 24px,rgba(139,92,246,.03) 25px)',
    accent: '#8B5CF6',
    accentLight: '#C4B5FD',
    text: '#ffffff',
    subText: 'rgba(255,255,255,0.55)',
    footerBg: 'rgba(0,0,0,0.3)',
    dark: true,
    decorationSvg: `<svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" style="${decoStyle('right:-80px;top:50%;transform:translateY(-50%);opacity:0.1')}">
  <circle cx="30" cy="200" r="10" fill="#8B5CF6"/>
  <path d="M30 200 Q95 130 95 200 Q95 270 30 200" stroke="#8B5CF6" stroke-width="2" fill="none"/>
  <path d="M30 200 Q160 80 160 200 Q160 320 30 200" stroke="#8B5CF6" stroke-width="2" fill="none"/>
  <path d="M30 200 Q225 30 225 200 Q225 370 30 200" stroke="#8B5CF6" stroke-width="1.8" fill="none"/>
  <path d="M30 200 Q290 -20 290 200 Q290 420 30 200" stroke="#8B5CF6" stroke-width="1.5" fill="none"/>
  <path d="M30 200 Q355 -70 355 200 Q355 470 30 200" stroke="#8B5CF6" stroke-width="1.2" fill="none"/>
  <path d="M30 200 Q410 -120 410 200 Q410 520 30 200" stroke="#8B5CF6" stroke-width="1" fill="none"/>
  <circle cx="95" cy="200" r="3" fill="#8B5CF6" fill-opacity="0.5"/>
  <circle cx="160" cy="200" r="3" fill="#8B5CF6" fill-opacity="0.5"/>
  <circle cx="225" cy="200" r="3" fill="#8B5CF6" fill-opacity="0.4"/>
</svg>`,
  },
]

export function getCoverStyle(id?: string | null): CoverStyle {
  return COVER_STYLES.find(s => s.id === id) ?? COVER_STYLES[0]
}
