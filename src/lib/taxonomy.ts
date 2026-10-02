/**
 * Classificação do catálogo da Plantec: categoria > subcategoria.
 *
 * Única fonte da verdade para os filtros, o formulário de produto e a BOM
 * agrupada. Antes a lista era fixa e duplicada em duas telas, e a categoria
 * vinha do `nsegmento` do Magento (4 valores): "Redes" levava disjuntor,
 * ferramenta e fita isolante, e os nobreaks ficavam em "Telecom".
 *
 * A classificação de cada produto fica em `attributes.classificacao` e o sync
 * a preserva (ver `classificacaoGuardada`). Ordem: manual > ia > regra.
 */

export interface CategoryDef {
  name: string
  subs: string[]
  /** Fora da busca de produtos para projeto por padrão (ferramenta, consumível). */
  auxiliar?: boolean
}

export const TAXONOMY: CategoryDef[] = [
  { name: 'CFTV', subs: ['Câmeras IP', 'Câmeras HDCVI', 'Gravadores', 'Armazenamento', 'Software de CFTV', 'Acessórios de CFTV'] },
  { name: 'Redes', subs: ['Switches', 'Roteadores e Wi-Fi', 'Óptica', 'Módulos e Conversores'] },
  { name: 'Cabeamento', subs: ['Cabos', 'Patch Cords', 'Conectores e Keystones', 'Patch Panels e Organizadores', 'Identificação'] },
  { name: 'Racks', subs: ['Racks', 'Acessórios de Rack'] },
  { name: 'Energia', subs: ['Nobreaks', 'Inversores', 'Baterias', 'Fontes', 'Proteção Elétrica', 'Energia Solar'] },
  { name: 'Infraestrutura Elétrica', subs: ['Cabos Elétricos', 'Disjuntores e Quadros', 'Tomadas e Interruptores', 'Canaletas e Eletrocalhas', 'Iluminação'] },
  { name: 'Controle de Acesso', subs: ['Leitores e Controladoras', 'Fechaduras', 'Catracas e Cancelas', 'Credenciais', 'Acionadores', 'Automatizadores'] },
  { name: 'Alarme e Incêndio', subs: ['Centrais de Alarme', 'Sensores', 'Sirenes', 'Cercas Elétricas', 'Detecção de Incêndio'] },
  { name: 'Portaria e Interfonia', subs: ['Videoporteiros', 'Porteiros e Interfones', 'Portaria Virtual'] },
  // Produtos digitados pelos projetistas (não vêm do Magento) — 02/10/2026
  { name: 'Displays e Telas de LED', subs: ['Painéis de LED', 'Videowall', 'Monitores e Displays', 'Processadores e Controladoras', 'Estruturas e Suportes'] },
  { name: 'Telefonia', subs: ['Centrais Telefônicas', 'Telefones e Headsets', 'Gateways VoIP', 'Rádios'] },
  { name: 'Mobilidade Elétrica', subs: ['Estação de recarga AC', 'Carregador portátil AC', 'Carregador rápido DC'] },
  { name: 'Informática', subs: ['Periféricos', 'Cabos e Adaptadores', 'Servidores'] },
  { name: 'Ferramentas e Consumíveis', subs: ['Ferramentas', 'Consumíveis'], auxiliar: true },
  { name: 'Licenças', subs: [] },
  { name: 'Serviços', subs: [] },
  { name: 'Outros', subs: [] },
]

export const CATEGORY_NAMES = TAXONOMY.map(c => c.name)

export function subcategoriesOf(category: string): string[] {
  return TAXONOMY.find(c => c.name === category)?.subs ?? []
}

/** Ordena nomes de categoria pela ordem da classificação; desconhecidas vão ao fim. */
export function byTaxonomyOrder(a: string, b: string): number {
  const ia = CATEGORY_NAMES.indexOf(a), ib = CATEGORY_NAMES.indexOf(b)
  return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b, 'pt-BR')
}

// ── Classificação por regra ──────────────────────────────────────────────────

export type ClassificacaoFonte = 'regra' | 'ia' | 'manual'

export interface Classificacao {
  category: string
  subcategory: string | null
  fonte: ClassificacaoFonte
  /** Regra que casou (fonte "regra") — ajuda a revisar em lote. */
  regra?: string
  em?: string
}

/** Maiúsculas e sem acento, para as regras não dependerem de grafia. */
export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
}

type Regra = [id: string, padrao: RegExp, category: string, subcategory: string | null]

/*
 * Regras sobre o NOME normalizado, em ordem: a primeira que casa vence. As mais
 * específicas vêm antes (ex.: "FONTE ... NOBREAK" antes de "FONTE"). O que
 * nenhuma regra pega fica sem classificação e vai para a etapa da IA.
 */
const REGRAS: Regra[] = [
  // Serviços e licenças primeiro: o nome costuma citar o equipamento ("Serviço de configuração CFTV")
  ['servico',          /^(SERVICO|CONTRATO|PROJETO EXECUTIVO|INSTALACAO)\b/,              'Serviços', null],
  ['licenca',          /^LICENCA\b|\bLICENCA DE (USO|SOFTWARE)\b/,                       'Licenças', null],

  // Cabos que não são de rede (vêm antes de óptica e de "cabo"): HDMI de fibra não é cabeamento óptico
  ['cabo-video',       /^(CABO|ADAPTADOR|CONVERSOR) (HDMI|VGA|USB|DISPLAY ?PORT|DVI|P2|RCA)\b/,     'Informática', 'Cabos e Adaptadores'],
  ['cabo-eletrico',    /^CABO (FLEX|FLEXIVEL|PP|PARALELO|RIGIDO|SOLIDO|DE (ENERGIA|FORCA)|ELETRICO)\b|^(CORDAO PROLONGADOR|EXTENSAO ELETRICA|EXTENSAO NO SHOCK|FIO (FLEX|RIGIDO|PARALELO))\b/, 'Infraestrutura Elétrica', 'Cabos Elétricos'],

  // Mobilidade elétrica
  ['carregador-ve',    /\b(CARREGADOR|ESTACAO DE RECARGA)\b.*\b(VEICULAR|VEICULO|EV|CVE|EVE)\b|\bWALLBOX\b/, 'Mobilidade Elétrica', null],

  // Energia
  ['solar',            /\b(FOTOVOLTAICO|PAINEL SOLAR|MICROINVERSOR|INVERSOR (SOLAR|FOTOVOLTAICO|ON-?GRID|OFF-?GRID|HIBRIDO)|STRING BOX)\b/, 'Energia', 'Energia Solar'],
  ['nobreak',          /^(NOBREAK|NO-BREAK|NO BREAK)\b/,                                  'Energia', 'Nobreaks'],
  ['inversor',         /^INVERSOR\b/,                                                     'Energia', 'Inversores'],
  ['bateria',          /^(BATERIA|MODULO DE BATERIA)\b/,                                                      'Energia', 'Baterias'],
  ['protecao',         /^(DPS|PROTETOR (ELETRICO|ELETRONICO|DE SURTO|CONTRA SURTO)|FILTRO DE LINHA|ESTABILIZADOR)\b/, 'Energia', 'Proteção Elétrica'],
  ['fonte',            /^(FONTE|POWER SUPPLY)\b/,                                          'Energia', 'Fontes'],

  // CFTV
  ['camera-hdcvi',     /\b(CAMERA|MINI ?DOME|BULLET)\b.*\b(HDCVI|HD-?CVI|MULTI-?HD|VHD|HDTVI|ANALOGICA)\b|\bVHD ?\d/, 'CFTV', 'Câmeras HDCVI'],
  ['camera-ip',        /^(CAMERA|MINI ?CAMERA|MINI ?DOME|SPEED ?DOME)\b|\bVIP ?\d|\bVIP[- ]\w/, 'CFTV', 'Câmeras IP'],
  ['gravador',         /^(NVR|DVR|XVR|GRAVADOR|MHDX|NVD|STAND ?ALONE)\b|\b(NVD|MHDX) ?\d/,             'CFTV', 'Gravadores'],
  ['armazenamento',    /^(HD|HARD ?DISK|DISCO RIGIDO|SSD|STORAGE|CARTAO (DE )?MEMORIA|MICRO ?SD)\b/, 'CFTV', 'Armazenamento'],
  ['software-cftv',    /^(D-GUARD|DGUARD|SOFTWARE)\b|\bVMS\b/,                            'CFTV', 'Software de CFTV'],
  ['acessorio-cftv',   /^(BALUN|CONECTOR (BNC|P4)|CAIXA DE PASSAGEM PARA CAMERA|SUPORTE (PARA|DE) CAMERA|INJETOR POE|EXTENSOR POE)\b/, 'CFTV', 'Acessórios de CFTV'],

  // Redes
  ['switch',           /^SWITCH\b/,                                                       'Redes', 'Switches'],
  ['roteador',         /^(ROTEADOR|ROUTER|ACCESS ?POINT|AP\b|MODEM|REPETIDOR|ONU|ONT|OLT|ANTENA\b(?!.*\b(TV|UHF|VHF|HDTV)\b).*\b(WI-?FI|DBI|GHZ|SETORIAL|GRADE|MIMO)|RADIO (OUTDOOR|DIGITAL PTP|PTP|PTMP)|MESH)\b/, 'Redes', 'Roteadores e Wi-Fi'],
  ['optica',           /^(DIO|SPLITTER|CORDAO OPTICO|EXTENSAO OPTICA|PIGTAIL|PIG ?TAIL|CTO|CEO|TERMINADOR OPTICO|CAIXA DE (TERMINACAO|EMENDA) OPTICA|ACOPLADOR|ADAPTADOR OPTICO|BANDEJA DE EMENDA|FUSAO)\b|\b(FIBRA OPTICA|CORDAO OPTICO|EXTENSAO OPTICA|EXTENSAO OPTICO)\b/, 'Redes', 'Óptica'],
  ['modulo-conversor', /^(MODULO|MINI ?GBIC|GBIC|TRANSCEIVER|CONVERSOR DE MIDIA)\b.*\b(SFP|GBIC|OPTICO|10G|1G|GIGABIT|FIBRA)\b|^(MINI ?GBIC|GBIC|TRANSCEIVER|CONVERSOR DE MIDIA)\b/, 'Redes', 'Módulos e Conversores'],

  // Cabeamento estruturado
  ['patch-cord',       /^(PATCH ?CORD|CABO PATCH|EXTENSAO (DE )?REDE)\b/,                 'Cabeamento', 'Patch Cords'],
  ['patch-panel',      /^(PATCH ?PANEL|ORGANIZADOR|GUIA DE CABOS)\b/,                     'Cabeamento', 'Patch Panels e Organizadores'],
  ['conector-rede',    /^(CONECTOR|KEYSTONE|JACK|PLUG|CAPA (PARA|DE) CONECTOR|TOMADA RJ ?45|MODULO (RJ|KEYSTONE))\b/, 'Cabeamento', 'Conectores e Keystones'],
  ['identificacao',    /^(ETIQUETA|IDENTIFICADOR|MARCADOR|FITA (PARA ROTULADOR|ROTULADORA|DE ETIQUETA)|ROTULADOR)\b/, 'Cabeamento', 'Identificação'],
  ['cabo',             /^CABO\b/,                                                         'Cabeamento', 'Cabos'],

  // Racks
  ['rack',             /^(RACK|MINI RACK|GABINETE)\b/,                                              'Racks', 'Racks'],
  ['acessorio-rack',   /^(BANDEJA|REGUA|VENTILADOR|PORCA GAIOLA|KIT (DE )?VENTILACAO|TAMPA (CEGA|DE RACK))\b/, 'Racks', 'Acessórios de Rack'],

  // Infraestrutura elétrica
  ['disjuntor',        /^(DISJUNTOR|MINIDISJUNTOR|MINI ?DISJUNTOR|QUADRO|BARRAMENTO|INTERRUPTOR DIFERENCIAL|DR\b|CONTATOR|PENTE)\b/, 'Infraestrutura Elétrica', 'Disjuntores e Quadros'],
  ['tomada',           /^(TOMADA|INTERRUPTOR|INTERRUPTORES|PLACA\b(?!.*\b(RAMA(L|IS)|TRONCO|CENTRAL|IMPACTA)\b).*\b[24] ?X ?[24]\b|PLACA\+|ESPELHO|CONJUNTO|MODULO (TOMADA|INTERRUPTOR|PULSADOR|CEGO)|CAMPAINHA|PULSADOR|DIMMER|SOQUETE|PLUGUE)\b/, 'Infraestrutura Elétrica', 'Tomadas e Interruptores'],
  ['canaleta',         /^(CANALETA|ELETROCALHA|CALHA|COTOVELO|DERIVACAO|DERIVADOR|CURVA|LUVA (DE )?(EMENDA|PARA (ELETRODUTO|CANALETA|ELETROCALHA)|PVC|ROSCAVEL|\d)|UNIAO|TE\b|TAMPA (DE )?(CANALETA|CALHA|ELETROCALHA)|ELETRODUTO|CONDULETE|CAIXA (DE )?(SOBREPOR|EMBUTIR|PASSAGEM)|PERFILADO|SAIDA LATERAL|EMENDA)\b/, 'Infraestrutura Elétrica', 'Canaletas e Eletrocalhas'],
  ['tela-led',         /\b(TELA|PAINEL|MODULO|GABINETE) (DE )?LED\b.*\b(P ?\d+([.,]\d+)?|PIXEL|INDOOR|OUTDOOR|RGB|M2|M²)\b|\bVIDEO ?WALL\b|\bLED WALL\b/, 'Displays e Telas de LED', null],
  ['iluminacao',       /^(LAMPADA|LUMINARIA|LED|REFLETOR|PAINEL LED|FITA LED|ARANDELA|PLAFON)\b/, 'Infraestrutura Elétrica', 'Iluminação'],

  // Controle de acesso
  ['catraca',          /^(CATRACA|CANCELA|TORNIQUETE)\b/,                                 'Controle de Acesso', 'Catracas e Cancelas'],
  ['fechadura',        /^(FECHADURA|ELETROIMA|FECHO|TRAVA)\b/,                             'Controle de Acesso', 'Fechaduras'],
  ['credencial',       /^(TAG|CARTAO (DE )?PROXIMIDADE|CARTAO RFID|CARTAO MIFARE|CARTAO\b|CHAVEIRO|PULSEIRA)\b/, 'Controle de Acesso', 'Credenciais'],
  ['acionador',        /^(ACIONADOR(?! MANUAL)|BOTAO|BOTOEIRA|MOLA|SUPORTE PARA MOLA)\b/,             'Controle de Acesso', 'Acionadores'],
  ['automatizador',    /^(AUTOMATIZADOR|MOTOR (DE )?PORTAO|CREMALHEIRA|CENTRAL (DE )?PORTAO)\b/, 'Controle de Acesso', 'Automatizadores'],
  ['leitor-acesso',    /^(LEITOR|CONTROLADORA|CONTROLADOR DE ACESSO|CONTROLE DE ACESSO|TERMINAL (FACIAL|DE ACESSO|BIOMETRICO))\b/, 'Controle de Acesso', 'Leitores e Controladoras'],

  // Alarme e incêndio
  ['incendio',         /^(DETECTOR|ACIONADOR MANUAL|CENTRAL (DE )?INCENDIO|SINALIZADOR AUDIOVISUAL|AVISADOR)\b|\bINCENDIO\b/, 'Alarme e Incêndio', 'Detecção de Incêndio'],
  ['central-alarme',   /^CENTRAL\b.*\b(ALARME|AMT|ANM)\b|^(AMT|ANM) ?\d/,                'Alarme e Incêndio', 'Centrais de Alarme'],
  ['cerca-eletrica',   /\bCERCA ELETRICA\b|^(ELETRIFICADOR|CENTRAL DE CHOQUE)\b/,              'Alarme e Incêndio', 'Cercas Elétricas'],
  ['sensor-iluminacao', /^SENSOR DE PRESENCA\b.*\b(ILUMINACAO|E27|ESPI|LAMPADA)\b|^SENSOR DE PRESENCA ESPI/, 'Infraestrutura Elétrica', 'Iluminação'],
  ['sensor',           /^(SENSOR|IVP|XAS|IMC|BARREIRA)\b/,                                 'Alarme e Incêndio', 'Sensores'],
  ['sirene',           /^SIRENE\b/,                                                       'Alarme e Incêndio', 'Sirenes'],

  // Portaria e interfonia
  ['videoporteiro',    /^(VIDEOPORTEIRO|KIT VIDEOPORTEIRO)\b|\bVIDEO ?PORTEIRO\b/, 'Portaria e Interfonia', 'Videoporteiros'],
  ['porteiro',         /^(PORTEIRO|INTERFONE|MONOFONE|TERMINAL DOMESTICO)\b/,              'Portaria e Interfonia', 'Porteiros e Interfones'],
  ['portaria-virtual', /\bPORTARIA (VIRTUAL|REMOTA)\b/,                                   'Portaria e Interfonia', 'Portaria Virtual'],

  // Telefonia
  ['central-telefonica', /^(CENTRAL|PABX)\b.*\b(PABX|TELEFON|IMPACTA|MODULARE|CONECTA|CORP|UNNITI|IP)\b|^PABX\b|^PLACA\b.*\b(RAMA(L|IS)|TRONCO|CENTRAL|IMPACTA|UNNITI|MODULARE)\b/, 'Telefonia', 'Centrais Telefônicas'],
  ['gateway-voip',     /^(GATEWAY|USER MEDIA GATEWAY|ATA|INTERFACE (GSM|CELULAR|FXS|FXO|E1))\b/, 'Telefonia', 'Gateways VoIP'],
  ['telefone',         /^(TELEFONE|HEADSET|FONE|APARELHO TELEFONICO|RAMAL|BINA|IDENTIFICADOR DE CHAMADAS)\b/, 'Telefonia', 'Telefones e Headsets'],
  ['radio',            /^(RADIO|RADIOS) (COMUNICADOR|COMUNICADORES|PORTATIL|HT)\b|^RADIOS\b/, 'Telefonia', 'Rádios'],

  // Informática
  ['periferico',       /^(IMPRESSORA|MOUSE|TECLADO USB|TECLADO E MOUSE|MONITOR|WEBCAM|PEN ?DRIVE|HUB USB|ADAPTADOR USB)\b/, 'Informática', 'Periféricos'],
  ['servidor',         /^(SERVIDOR|MINI ?PC|COMPUTADOR|WORKSTATION)\b/,                    'Informática', 'Servidores'],

  // Ferramentas e consumíveis
  ['ferramenta',       /^(ALICATE|SERRA|SERROTE|BROCA|CHAVE (DE FENDA|PHILIPS|HEXAGONAL|ALLEN|COMBINADA|INGLESA|CANHAO|TORX)|DECAPADOR|FERRAMENTA|ESTILETE|MARTELO|TRENA|NIVEL|PARAFUSADEIRA|FURADEIRA|TESTADOR|MULTIMETRO|PUNCH ?DOWN|CRIMPADOR|ALCA)\b/, 'Ferramentas e Consumíveis', 'Ferramentas'],
  ['consumivel',       /^(FITA|LUVA|ABRACADEIRA|PARAFUSO|BUCHA|ARRUELA|PORCA|ESPUMA|SILICONE|COLA|VELCRO|LACRE|TERMINAL (TUBULAR|OLHAL|FORQUILHA|PINO)|ISOLADOR|HASTE)\b/, 'Ferramentas e Consumíveis', 'Consumíveis'],
]

/** Classifica pelo nome. Devolve null quando nenhuma regra é segura o bastante. */
export function classificarPorRegra(name: string): Classificacao | null {
  const n = normalizar(name).replace(/\s+/g, ' ').trim()
  for (const [id, padrao, category, subcategory] of REGRAS) {
    if (padrao.test(n)) return { category, subcategory, fonte: 'regra', regra: id }
  }
  return null
}

/** Classificação gravada no produto, se houver (manual, ia ou regra). */
export function classificacaoGuardada(attributes: unknown): Classificacao | null {
  const c = (attributes as { classificacao?: Classificacao } | null)?.classificacao
  return c && typeof c.category === 'string' ? c : null
}
