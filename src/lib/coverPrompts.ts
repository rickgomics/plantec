/**
 * Prompts de arte de capa, um por segmento.
 *
 * A imagem é FUNDO de capa: o título, o cliente e o rodapé são escritos por
 * cima em HTML. Por isso todo prompt pede composição escura, sem texto e com
 * o lado esquerdo limpo — é onde o conteúdo da capa cai.
 */

export interface CoverPrompt {
  /** Casa com CoverStyle.id em coverStyles.ts */
  id: string
  label: string
  prompt: string
}

const COMUM =
  'Abstract corporate background artwork, dark moody palette, subtle geometric ' +
  'depth, cinematic lighting, high detail, no text, no letters, no logos, ' +
  'no people, no watermarks. Composition must keep the LEFT HALF visually calm ' +
  'and uncluttered for overlaid text; place visual interest on the right side. ' +
  'Vertical A4 poster proportions.'

export const COVER_PROMPTS: CoverPrompt[] = [
  {
    id: 'security',
    label: 'Segurança Eletrônica',
    prompt:
      'Security operations centre seen from a distance: a wall of dark monitoring ' +
      'screens, faint red indicator glows, a stylised surveillance lens motif. ' +
      'Deep charcoal blues with crimson accents. ' + COMUM,
  },
  {
    id: 'networks',
    label: 'Redes & Cabeamento',
    prompt:
      'Fibre optic strands fanning out into a dark data centre aisle, glowing cyan ' +
      'nodes connected by thin light paths, structured cabling geometry. ' +
      'Deep navy with cyan accents. ' + COMUM,
  },
  {
    id: 'access',
    label: 'Controle de Acesso',
    prompt:
      'Abstract biometric identity motif: concentric fingerprint-like arcs and a ' +
      'secure turnstile silhouette, emerald light tracing the contours. ' +
      'Deep forest green with emerald accents. ' + COMUM,
  },
  {
    id: 'energy',
    label: 'Energia',
    prompt:
      'Electrical infrastructure abstraction: power distribution geometry, a bolt of ' +
      'energy arcing through dark space, subtle circuitry. ' +
      'Deep brown-black with amber and orange accents. ' + COMUM,
  },
  {
    id: 'comms',
    label: 'Comunicações',
    prompt:
      'Signal propagation abstraction: concentric transmission waves radiating from ' +
      'a single point, communication towers in silhouette, violet light. ' +
      'Deep indigo with violet accents. ' + COMUM,
  },
]

export function getCoverPrompt(id: string): CoverPrompt | undefined {
  return COVER_PROMPTS.find(p => p.id === id)
}
