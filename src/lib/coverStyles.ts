export type CoverStyleId = 'teal' | 'carbon' | 'ocean' | 'burgundy' | 'pearl'

export interface CoverStyle {
  id: CoverStyleId
  name: string
  bg: string
  pattern: string
  accent: string
  accentLight: string
  text: string
  subText: string
  footerBg: string
  dark: boolean
}

export const COVER_STYLES: CoverStyle[] = [
  {
    id: 'teal',
    name: 'Emerald',
    bg: 'linear-gradient(160deg, #002827 0%, #004341 45%, #005F5C 100%)',
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
    bg: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #334155 100%)',
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
    bg: 'linear-gradient(160deg, #0C1A3C 0%, #1E3A8A 55%, #1D4ED8 100%)',
    pattern: 'radial-gradient(ellipse at 80% 20%, rgba(96,165,250,.18) 0%, transparent 55%), radial-gradient(ellipse at 10% 80%, rgba(30,58,138,.4) 0%, transparent 50%)',
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
    bg: 'linear-gradient(160deg, #1A0A0A 0%, #450A0A 55%, #7F1D1D 100%)',
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
    bg: 'linear-gradient(160deg, #F8FAFC 0%, #F1F5F9 60%, #E2E8F0 100%)',
    pattern: '',
    accent: '#00928E',
    accentLight: '#26A39F',
    text: '#002827',
    subText: 'rgba(0,40,39,0.5)',
    footerBg: '#E6F5F4',
    dark: false,
  },
]

export function getCoverStyle(id?: string | null): CoverStyle {
  return COVER_STYLES.find(s => s.id === id) ?? COVER_STYLES[0]
}
