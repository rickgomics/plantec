import type { CoverStyleId } from './coverStyles'

/**
 * Segmentos da proposta (o que a capa imprime acima do título) e o tema de
 * capa de cada um. Lista única para a criação da proposta e o editor.
 */
export const SEGMENTOS = ['CFTV', 'Redes', 'Energia', 'Controle de Acesso', 'Displays e Telas de LED', 'Comunicações', 'Infraestrutura', 'Serviços', 'Geral']

/** Tema de capa que acompanha o segmento (segmentos sem tema usam o clássico). */
export const TEMA_DO_SEGMENTO: Record<string, CoverStyleId> = {
  'CFTV': 'security',
  'Redes': 'networks',
  'Controle de Acesso': 'access',
  'Energia': 'energy',
  'Comunicações': 'comms',
  'Telecom': 'comms',
  'Displays e Telas de LED': 'displays',
}

/** Segmento que corresponde a um tema de capa de segmento. */
export function segmentoDoTema(tema: string): string | undefined {
  return Object.entries(TEMA_DO_SEGMENTO).find(([, t]) => t === tema)?.[0]
}
