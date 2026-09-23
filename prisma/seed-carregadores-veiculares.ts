/**
 * Catálogo provisório: carregadores veiculares Intelbras (linha CVE/EVE).
 *
 * Rodar com: npm run seed:carregadores
 *
 * Por que existe: a loja não tem attribute set para estação de recarga, então
 * o sync do Magento traz esses produtos sem uma linha de ficha técnica e com
 * categoria CFTV (nsegmento 5). Sem ficha o projetista não consegue dimensionar
 * nem justificar a escolha do modelo na proposta.
 *
 * As fichas abaixo foram transcritas dos datasheets oficiais em PDF do CDN da
 * Intelbras (`backend.intelbras.com`), um por modelo — a URL de cada um está em
 * `fonte`. Os produtos ficam marcados com `attributes.specsManuais = true`, que
 * é o que faz o sync preservar a ficha e a categoria na carga seguinte
 * (ver src/app/api/plantec/sync/route.ts).
 *
 * Preço: quem já existe no catálogo mantém o preço local. Quem é criado aqui
 * nasce com o preço da loja, pela mesma regra do sync (menor tier de qtd. 1),
 * e o projetista sobrescreve no item da proposta — o item vira `manual` e o
 * /reprice em lote não encosta mais nele.
 *
 * SKU: os nove modelos que existem no ERP entram com o código do ERP, para que
 * o sync assuma o produto quando o e-commerce publicar. Os dois que não existem
 * no ERP entram com SKU `PROV-*` e precisam ser trocados pelo código real
 * quando forem cadastrados.
 */
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const BASE  = (process.env.MAGENTO_URL ?? '').replace(/\/$/, '')
const TOKEN = process.env.MAGENTO_TOKEN ?? ''

const CATEGORIA = 'Mobilidade Elétrica'

interface Carregador {
  /** Código do ERP/Magento, ou `PROV-…` para o que ainda não foi cadastrado */
  sku: string
  /** Código do modelo na Intelbras */
  modelo: string
  nome: string
  descricao: string
  subcategoria: string
  potenciaKw: number
  fonte: string
  /** Ressalva gravada junto da fonte, quando o dado não vem de datasheet próprio */
  ressalva?: string
  /** Ordem das chaves = ordem em que a ficha aparece na tela */
  specs: Record<string, string>
}

const CARREGADORES: Carregador[] = [
  {
    sku: 'PROV-CVE-3000P',
    modelo: 'CVE 3000P',
    nome: 'Carregador portátil para veículos elétricos tipo 2 Mini 3 kW CVE 3000P - INTELBRAS',
    descricao:
      'Carregador portátil de 3 kW para veículos elétricos, com conector tipo 2 e cabo de 4 m. ' +
      'Plugue de entrada NBR 14136 de 20 A: liga em tomada comum reforçada, sem obra. ' +
      'Indicado como carregador de emergência levado no porta-malas.',
    subcategoria: 'Carregador portátil AC',
    potenciaKw: 3,
    fonte: 'https://backend.intelbras.com/sites/default/files/2023-09/CVE%203000P%20-%20Datasheet%20rev%201.6.pdf',
    specs: {
      tipoCorrente:        'Corrente alternada (AC)',
      potencia:            '3 kW (2,9 kW em 220 V)',
      tensao:              '230 V (±10%)',
      fases:               'F+N+T ou 2F+T (monofásico ou bifásico)',
      correnteMax:         '13 A',
      saidas:              '1',
      conector:            'Tipo 2 (europeu); plugue de entrada NBR 14136 20 A',
      cabo:                'Cabo fixo de 4 m',
      grauDeProtecao:      'IP65',
      conectividade:       'Não possui',
      ocpp:                'Não possui',
      controleAcesso:      'Plug and Play',
      display:             'Não possui (indicação por LED verde/amarelo/vermelho)',
      protecoes:           'Sobrecorrente, corrente residual, surtos elétricos, sobre e subtensão, sobre e subfrequência, sobre e subtemperatura. MTBF de 100.000 horas',
      temperaturaOperacao: '-30 °C a +50 °C',
      dimensoes:           '195 × 74 × 47 mm (A × L × P)',
      peso:                '0,5 kg',
      instalacao:          'Portátil',
      garantia:            '2 anos',
    },
  },
  {
    sku: '4820096',
    modelo: 'EVE 0074H',
    nome: 'ESTACAO DE RECARGA PARA VEICULOS ELETRICOS HOME 7.4KW EVE 0074H - INTELBRAS',
    descricao:
      'Estação de recarga residencial de 7,4 kW com conector tipo 2 e cabo de 4 m. ' +
      'Libera a recarga por cartão RFID Mifare ou em modo Plug and Play. ' +
      'É o único modelo AC da linha sem conectividade e sem OCPP: não integra à plataforma de gestão.',
    subcategoria: 'Estação de recarga AC',
    potenciaKw: 7.4,
    fonte: 'https://backend.intelbras.com/sites/default/files/2024-08/EVE%200074H%20-%20Datasheet%20rev%201.7.pdf',
    specs: {
      tipoCorrente:        'Corrente alternada (AC)',
      potencia:            '7,4 kW (7,0 kW em 220 V; 4,1 kW em 127 V)',
      tensao:              '100 a 240 V (±10%)',
      fases:               'F+N+T ou 2F+T (monofásico ou bifásico)',
      correnteMax:         '32 A',
      saidas:              '1',
      conector:            'Tipo 2 (europeu)',
      cabo:                'Cabo fixo de 4 m',
      grauDeProtecao:      'IP65',
      conectividade:       'Não possui',
      ocpp:                'Não possui',
      controleAcesso:      'Plug and Play ou cartão RFID Mifare ISO/IEC 14443 A (sem aplicativo)',
      display:             'Não possui (indicação por LED verde/amarelo/vermelho)',
      protecoes:           'Sobrecorrente, corrente residual, surtos elétricos, sobre e subtensão, sobre e subfrequência, sobre e subtemperatura, detecção de corrente de fuga de 6 mA CC e parada de emergência',
      temperaturaOperacao: '-30 °C a +50 °C',
      dimensoes:           '233 × 150 × 70 mm (A × L × P)',
      peso:                '3,6 kg',
      instalacao:          'Parede ou pedestal (pedestal acessório, código 4820101)',
      garantia:            '2 anos',
    },
  },
  {
    sku: '4820095',
    modelo: 'EVE 0074C',
    nome: 'ESTACAO DE RECARGA PARA VEICULOS ELETRICOS CITY 7.4KW EVE 0074C - INTELBRAS',
    descricao:
      'Estação de recarga de 7,4 kW com conector tipo 2, cabo de 4 m, Wi-Fi e OCPP 1.6 JSON. ' +
      'Gestão pelo aplicativo Intelbras CVE e pela plataforma CVE PRO, com liberação por RFID, ' +
      'aplicativo ou Plug and Play.',
    subcategoria: 'Estação de recarga AC',
    potenciaKw: 7.4,
    fonte: 'https://backend.intelbras.com/sites/default/files/2023-09/EVE%200074C%20-%20Datasheet%20rev%201.6.pdf',
    specs: {
      tipoCorrente:        'Corrente alternada (AC)',
      potencia:            '7,4 kW (7,0 kW em 220 V)',
      tensao:              '230 V (±10%)',
      fases:               'F+N+T ou 2F+T (monofásico ou bifásico)',
      correnteMax:         '32 A',
      saidas:              '1',
      conector:            'Tipo 2 (europeu)',
      cabo:                'Cabo fixo de 4 m',
      grauDeProtecao:      'IP65',
      conectividade:       'Wi-Fi 2,4 GHz',
      ocpp:                '1.6 JSON',
      controleAcesso:      'Plug and Play, cartão RFID Mifare ISO/IEC 14443 A ou aplicativo Intelbras CVE (plataforma CVE PRO)',
      display:             'Não possui (indicação por LED)',
      protecoes:           'Sobrecorrente, corrente residual, surtos elétricos, sobre e subtensão, sobre e subfrequência, sobre e subtemperatura e detecção de corrente de fuga de 6 mA CC',
      temperaturaOperacao: '-30 °C a +50 °C',
      dimensoes:           '325 × 181 × 87 mm (A × L × P)',
      peso:                '3,2 kg',
      instalacao:          'Parede ou pedestal',
      garantia:            '2 anos',
    },
  },
  {
    sku: 'PROV-EVE-0110C',
    modelo: 'EVE 0110C',
    nome: 'ESTACAO DE RECARGA PARA VEICULOS ELETRICOS CITY 11KW EVE 0110C - INTELBRAS',
    descricao:
      'Estação de recarga trifásica de 11 kW com conector tipo 2, cabo de 4 m, Wi-Fi e OCPP 1.6 JSON. ' +
      'Mesmo gabinete da City 7,4 kW, porém exige rede trifásica 400 V — em ligação monofásica ' +
      'entrega apenas 3,5 kW.',
    subcategoria: 'Estação de recarga AC',
    potenciaKw: 11,
    fonte: 'https://backend.intelbras.com/sites/default/files/2023-09/EVE%200110C%20-%20Datasheet%20rev%201.6.pdf',
    specs: {
      tipoCorrente:        'Corrente alternada (AC)',
      potencia:            '11 kW (10,5 kW em 380 V; 3,5 kW em 220 V monofásico ou bifásico)',
      tensao:              '400 V (±10%)',
      fases:               '3F+N+T (trifásico)',
      correnteMax:         '16 A',
      saidas:              '1',
      conector:            'Tipo 2 (europeu)',
      cabo:                'Cabo fixo de 4 m',
      grauDeProtecao:      'IP65',
      conectividade:       'Wi-Fi 2,4 GHz',
      ocpp:                '1.6 JSON',
      controleAcesso:      'Plug and Play, cartão RFID Mifare ISO/IEC 14443 A ou aplicativo Intelbras CVE (plataforma CVE PRO)',
      display:             'Não possui (indicação por LED)',
      protecoes:           'Sobrecorrente, corrente residual, surtos elétricos, sobre e subtensão, sobre e subfrequência, sobre e subtemperatura e detecção de corrente de fuga de 6 mA CC',
      temperaturaOperacao: '-30 °C a +50 °C',
      dimensoes:           '325 × 181 × 87 mm (A × L × P)',
      peso:                '3,2 kg',
      instalacao:          'Parede ou pedestal',
      garantia:            '2 anos',
    },
  },
  {
    sku: '4820099',
    modelo: 'EVE 0074B',
    nome: 'ESTAÇÃO DE RECARGA PARA VEÍCULOS ELÉTRICOS BUSINESS 7.4KW EVE 0074B INTELBRAS',
    descricao:
      'Estação de recarga corporativa de 7,4 kW com conector tipo 2, cabo de 4 m e display LCD de 2,7". ' +
      'Traz Wi-Fi e Ethernet, OCPP 1.6 JSON e, ao contrário das linhas Home e City, ' +
      'já vem com disjuntor e IDR tipo A internos — dispensa quadro de proteção dedicado.',
    subcategoria: 'Estação de recarga AC',
    potenciaKw: 7.4,
    fonte: 'https://backend.intelbras.com/sites/default/files/2023-09/EVE%200074B%20-%20Datasheet%20rev%201.6.pdf',
    specs: {
      tipoCorrente:        'Corrente alternada (AC)',
      potencia:            '7,4 kW (7,0 kW em 220 V)',
      tensao:              '230 V (±10%)',
      fases:               'F+N+T ou 2F+T (monofásico ou bifásico)',
      correnteMax:         '32 A',
      saidas:              '1',
      conector:            'Tipo 2 (europeu)',
      cabo:                'Cabo fixo de 4 m',
      grauDeProtecao:      'IP65',
      conectividade:       'Wi-Fi 2,4 GHz e Ethernet (sem 3G/4G)',
      ocpp:                '1.6 JSON',
      controleAcesso:      'Plug and Play, cartão RFID Mifare ISO/IEC 14443 A ou aplicativo Intelbras CVE (plataforma CVE PRO)',
      display:             'LCD de 2,7"',
      protecoes:           'Disjuntor e IDR tipo A internos. Sobrecorrente, corrente residual, surtos elétricos, sobre e subtensão, sobre e subfrequência, sobre e subtemperatura e detecção de corrente de fuga de 6 mA CC',
      temperaturaOperacao: '-30 °C a +50 °C',
      dimensoes:           '356 × 221 × 136 mm (A × L × P)',
      peso:                '4,7 kg',
      instalacao:          'Parede ou pedestal (pedestal acessório, código 4820108)',
      garantia:            '2 anos',
    },
  },
  {
    sku: '4820098',
    modelo: 'EVE 0220B',
    nome: 'ESTAÇÃO DE RECARGA PARA VEÍCULOS ELÉTRICOS BUSINESS 22 KW EVE 0220B - INTELBRAS',
    descricao:
      'Estação de recarga corporativa trifásica de 22 kW com conector tipo 2, cabo de 4 m e display LCD de 2,7". ' +
      'Gabinete em aço galvanizado com painel frontal em vidro temperado, Wi-Fi e Ethernet, OCPP 1.6 JSON, ' +
      'disjuntor e IDR tipo A internos. É a maior potência AC da linha.',
    subcategoria: 'Estação de recarga AC',
    potenciaKw: 22,
    fonte: 'https://backend.intelbras.com/sites/default/files/2023-09/EVE%200220B%20-%20Datasheet%20rev%201.6.pdf',
    specs: {
      tipoCorrente:        'Corrente alternada (AC)',
      potencia:            '22 kW (21,1 kW em 380 V)',
      tensao:              '400 V (±10%)',
      fases:               '3F+N+T (trifásico)',
      correnteMax:         '32 A',
      saidas:              '1',
      conector:            'Tipo 2 (europeu)',
      cabo:                'Cabo fixo de 4 m',
      grauDeProtecao:      'IP65',
      conectividade:       'Wi-Fi 2,4 GHz e Ethernet (sem 3G/4G)',
      ocpp:                '1.6 JSON',
      controleAcesso:      'Plug and Play, cartão RFID Mifare ISO/IEC 14443 A ou aplicativo Intelbras CVE (plataforma CVE PRO)',
      display:             'LCD de 2,7"',
      protecoes:           'Disjuntor e IDR tipo A internos. Sobrecorrente, corrente residual, surtos elétricos, sobre e subtensão, sobre e subfrequência, sobre e subtemperatura e detecção de corrente de fuga de 6 mA CC',
      temperaturaOperacao: '-30 °C a +50 °C',
      dimensoes:           '452 × 295 × 148 mm (A × L × P)',
      peso:                '13 kg',
      instalacao:          'Parede ou pedestal (pedestal acessório, código 4820102)',
      garantia:            '2 anos',
    },
  },
  {
    sku: '4820143',
    modelo: 'EVE 0300FP',
    nome: 'ESTACAO RECARGA VEICULOS ELETRICOS CVE FLEET PRO 30 EVE 0300FP - INTELBRAS',
    descricao:
      'Carregador rápido em corrente contínua de 30 kW, com uma saída CCS2 e cabo de 5 m. ' +
      'Display de 7" sensível ao toque, Wi-Fi, Ethernet e 4G com redundância, OCPP 1.6 JSON e Autocharge. ' +
      'Único DC da linha que ainda pode ser instalado em parede.',
    subcategoria: 'Carregador rápido DC',
    potenciaKw: 30,
    fonte: 'https://backend.intelbras.com/sites/default/files/2024-09/EVE%200300FP%20-%20Datasheet%201.6.pdf',
    specs: {
      tipoCorrente:        'Corrente contínua (DC)',
      potencia:            '30 kW (até 55 °C). Eficiência mínima de 94% e máxima de 95%',
      tensao:              'Entrada 400 V (±10%), faixa de 342 a 440 V; saída CC de 200 a 1000 V',
      fases:               '3F+N+T (trifásico), corrente de entrada 50 A',
      correnteMax:         '100 A na saída CC',
      saidas:              '1',
      conector:            'CCS2',
      cabo:                'Cabo fixo de 5 m úteis',
      grauDeProtecao:      'IP55 na estação (conector IP54 solto e IP67 conectado ao veículo). IK10 no gabinete e IK08 no display',
      conectividade:       'Wi-Fi 2,4 GHz, Ethernet e 4G, com redundância de conexão configurável',
      ocpp:                '1.6 JSON (perfis de segurança 1, 2 e 3)',
      controleAcesso:      'Plug and Play, cartão RFID 13,56 MHz, aplicativo Intelbras CVE ou Autocharge',
      display:             'LCD de 7" sensível ao toque, com controle de luminosidade (português, inglês e espanhol)',
      protecoes:           'Disjuntor interno curva C 63 A 6 kA, IDR interno tipo A 30 mA 63 A, DPS interno classe II 20 kA e botão de emergência. Sobrecorrente, corrente residual, surtos elétricos, sobre e subtensão, sobre e subfrequência, sobre e subtemperatura, falhas de hardware, falha de comunicação com o veículo, falha de isolação e deslocamento. Medidor de energia CC classe 0,5',
      temperaturaOperacao: '-30 °C a +50 °C (redução de potência a partir de 55 °C no módulo de potência)',
      dimensoes:           '440 × 680 × 285 mm (A × L × P)',
      peso:                '57 kg (com o módulo de potência)',
      instalacao:          'Parede ou pedestal (pedestal acessório, código 4820161, não incluso)',
      garantia:            '2 anos (3 meses de garantia padrão e 21 meses contratuais)',
    },
  },
  {
    sku: '4300244',
    modelo: 'EVE 0600FP',
    nome: 'ESTACAO RECARGA VEICULOS ELETRICOS CVE FLEET PRO 60 EVE 0600FP - INTELBRAS',
    descricao:
      'Carregador rápido em corrente contínua de 60 kW, com duas saídas CCS2 e cabos de 5 m. ' +
      'Gabinete de piso em aço inoxidável 430, display de 7" sensível ao toque, Wi-Fi, Ethernet e 4G ' +
      'com redundância, OCPP 1.6 JSON e Autocharge.',
    subcategoria: 'Carregador rápido DC',
    potenciaKw: 60,
    fonte: 'https://backend.intelbras.com/sites/default/files/2025-07/EVE%200600FP%20-%20Datasheet%201.5.pdf',
    specs: {
      tipoCorrente:        'Corrente contínua (DC)',
      potencia:            '60 kW (até 55 °C). Eficiência mínima de 94% e máxima de 95%',
      tensao:              'Entrada 400 V (±10%), faixa de 342 a 440 V; saída CC de 150 a 1000 V',
      fases:               '3F+N+T (trifásico), corrente de entrada 100 A',
      correnteMax:         '200 A por saída CCS2',
      saidas:              '2',
      conector:            '2 × CCS2',
      cabo:                'Cabos fixos de 5 m úteis',
      grauDeProtecao:      'IP55 na estação (conector IP54 solto e IP67 conectado ao veículo). IK10 no gabinete e IK08 no display',
      conectividade:       'Wi-Fi 2,4 GHz, Ethernet e 4G, com redundância de conexão configurável',
      ocpp:                '1.6 JSON (perfis de segurança 1, 2 e 3)',
      controleAcesso:      'Plug and Play, cartão RFID 13,56 MHz, aplicativo Intelbras CVE ou Autocharge',
      display:             'LCD de 7" sensível ao toque (português, inglês e espanhol)',
      protecoes:           'Disjuntor, IDR tipo A e DPS internos. Sobrecorrente, corrente residual, surtos elétricos, sobre e subtensão, sobre e subfrequência, sobre e subtemperatura, falhas de hardware, falha de comunicação com o veículo, falha de isolação, parada de emergência e deslocamento. Medidor de energia CC classe 0,5. Gabinete em aço inoxidável 430',
      temperaturaOperacao: '-30 °C a +50 °C (redução de potência a partir de 55 °C no módulo de potência)',
      dimensoes:           '1650 × 700 × 457,5 mm (A × L × P); 1894 × 1050 × 710 mm com o sistema de sustentação de cabos',
      peso:                '229 kg',
      instalacao:          'Piso (içamento por olhal ou empilhadeira)',
      garantia:            '2 anos (3 meses de garantia padrão e 21 meses contratuais)',
    },
  },
  {
    sku: '4300892',
    modelo: 'EVE 0800FP',
    nome: 'ESTACAO RECARGA VEICULOS ELETRICOS CVE FLEET PRO 80 EVE 0800FP - INTELBRAS',
    descricao:
      'Carregador rápido em corrente contínua de 80 kW, com duas saídas CCS2 e cabos de 5 m. ' +
      'Divide a potência entre os dois veículos em passos de 40 kW e chega a 97% de eficiência. ' +
      'Certificado pelo Inmetro (ABNT NBR IEC 61851-23).',
    subcategoria: 'Carregador rápido DC',
    potenciaKw: 80,
    fonte: 'https://backend.intelbras.com/sites/default/files/2026-07/EVE%200800FP%20-%20Datasheet%201.2.pdf',
    specs: {
      tipoCorrente:        'Corrente contínua (DC)',
      potencia:            '80 kW (até 50 °C), eficiência máxima de 97%. Divisão dinâmica de potência em passos de 40 kW',
      tensao:              'Entrada 400 V (±10%), faixa de 342 a 440 V; saída CC de 150 a 1000 V',
      fases:               '3F+N+T (trifásico), corrente de entrada 130 A',
      correnteMax:         '200 A por saída CCS2',
      saidas:              '2',
      conector:            '2 × CCS2',
      cabo:                'Cabos fixos de 5 m úteis',
      grauDeProtecao:      'IP55 na estação (conector IP54 solto e IP67 conectado ao veículo). IK10 no gabinete e IK08 no display',
      conectividade:       'Wi-Fi 2,4 GHz, Ethernet (IPv4/IPv6) e 4G, com redundância de conexão configurável',
      ocpp:                '1.6 JSON (perfis de segurança 1, 2 e 3)',
      controleAcesso:      'Plug and Play, cartão RFID 13,56 MHz, aplicativo Intelbras CVE ou Autocharge',
      display:             'LCD de 7" sensível ao toque (português, inglês e espanhol)',
      protecoes:           'Disjuntor, IDR tipo A e DPS internos. Sobrecorrente, corrente residual, surtos elétricos, sobre e subtensão, sobre e subfrequência, sobre e subtemperatura, falhas de hardware, falha de comunicação com o veículo, falha de isolação, parada de emergência e deslocamento. Medidor de energia CC classe 0,5. Gabinete em aço inoxidável 430. Certificação acreditada pelo Inmetro, executada pela PCN nº 3120260000600',
      temperaturaOperacao: '-30 °C a +50 °C',
      dimensoes:           '1650 × 700 × 457,5 mm (A × L × P); 1894 × 1050 × 710 mm com o sistema de sustentação de cabos',
      peso:                '229 kg',
      instalacao:          'Piso (içamento por olhal ou empilhadeira)',
      garantia:            '2 anos (3 meses de garantia padrão e 21 meses contratuais)',
    },
  },
  {
    sku: '4300430',
    modelo: 'EVE 1200FC',
    nome: 'ESTACAO RECARGA VEICULOS ELETRICOS CVE FLEET CHARGE 120 EVE 1200FC - INTELBRAS',
    descricao:
      'Carregador rápido em corrente contínua de 120 kW, com duas saídas CCS2 e cabos de 5 m. ' +
      'Gabinete de piso do Fleet Charge com display de 10,4" sensível ao toque, Wi-Fi, Ethernet e 4G ' +
      'com redundância, OCPP 1.6 JSON e Autocharge.',
    subcategoria: 'Carregador rápido DC',
    potenciaKw: 120,
    fonte: 'https://backend.intelbras.com/sites/default/files/2026-07/EVE%201800FC%20-%20Datasheet%201.5.pdf',
    ressalva:
      'A Intelbras não publica datasheet dedicado do EVE 1200FC. Os dados vêm da coluna de 120 kW ' +
      'da tabela de família do datasheet do EVE 1800FC rev 1.5, que cobre as versões de 90, 120, 150 ' +
      'e 180 kW do mesmo gabinete. Confirmar com a Intelbras antes de fechar proposta.',
    specs: {
      tipoCorrente:        'Corrente contínua (DC)',
      potencia:            '120 kW (até 50 °C). Eficiência mínima de 95%',
      tensao:              'Entrada 400 V (±15%), faixa de 340 a 460 V; saída CC de 150 a 1000 V',
      fases:               '3F+N+T (trifásico), corrente de entrada 194 A em 380 V',
      correnteMax:         '300 A por saída CCS2',
      saidas:              '2',
      conector:            '2 × CCS2',
      cabo:                'Cabos fixos de 5 m úteis',
      grauDeProtecao:      'IP55 na estação (conector IP54 solto e IP67 conectado ao veículo). IK10 no gabinete e IK08 no display',
      conectividade:       'Wi-Fi 2,4 GHz, Ethernet (IPv4/IPv6) e 4G, com redundância de conexão configurável',
      ocpp:                '1.6 JSON (perfis de segurança 1, 2 e 3)',
      controleAcesso:      'Plug and Play, cartão RFID 13,56 MHz, aplicativo Intelbras CVE ou Autocharge',
      display:             'LCD de 10,4" sensível ao toque (português, inglês e espanhol)',
      protecoes:           'Disjuntor, IDR tipo A e DPS internos. Sobrecorrente, corrente residual, surtos elétricos, sobre e subtensão, sobre e subfrequência, sobre e subtemperatura, falhas de hardware, falha de comunicação com o veículo, falha de isolação, parada de emergência, deslocamento e nível de água. Medidor de energia CC classe 0,5. Certificação acreditada pelo Inmetro, executada pela PCN nº 3120260000600',
      temperaturaOperacao: '-30 °C a +50 °C',
      dimensoes:           '750 × 1790 × 720 mm (L × A × P)',
      peso:                '355 kg líquidos (416 kg brutos)',
      instalacao:          'Piso (içamento por olhal ou empilhadeira)',
      garantia:            '24 meses (3 meses de garantia padrão e 21 meses contratuais)',
    },
  },
  {
    sku: '4300384',
    modelo: 'EVE 1800FC',
    nome: 'ESTACAO RECARGA VEICULOS ELETRICOS CVE FLEET CHARGE 180 EVE 1800FC - INTELBRAS',
    descricao:
      'Carregador rápido em corrente contínua de 180 kW, com duas saídas CCS2 e cabos de 5 m. ' +
      'Divide a potência entre os dois veículos em passos de 30 kW, nos modos Igualdade e ordem de ' +
      'chegada. Display de 10,4" sensível ao toque e certificação Inmetro. Maior potência da linha.',
    subcategoria: 'Carregador rápido DC',
    potenciaKw: 180,
    fonte: 'https://backend.intelbras.com/sites/default/files/2026-07/EVE%201800FC%20-%20Datasheet%201.5.pdf',
    specs: {
      tipoCorrente:        'Corrente contínua (DC)',
      potencia:            '180 kW (até 50 °C). Eficiência mínima de 95%. Divisão dinâmica de potência em passos de 30 kW, nos modos Igualdade e ordem de chegada',
      tensao:              'Entrada 400 V (±15%), faixa de 340 a 460 V; saída CC de 150 a 1000 V',
      fases:               '3F+N+T (trifásico), corrente de entrada 291 A em 380 V',
      correnteMax:         '300 A por saída CCS2',
      saidas:              '2',
      conector:            '2 × CCS2',
      cabo:                'Cabos fixos de 5 m úteis',
      grauDeProtecao:      'IP55 na estação (conector IP54 solto e IP67 conectado ao veículo). IK10 no gabinete e IK08 no display',
      conectividade:       'Wi-Fi 2,4 GHz (IPv4), Ethernet (IPv4/IPv6) e 4G, com redundância de conexão configurável',
      ocpp:                '1.6 JSON (perfis de segurança 1, 2 e 3)',
      controleAcesso:      'Plug and Play, cartão RFID 13,56 MHz ISO/IEC 14443 A/B Mifare, aplicativo Intelbras CVE ou Autocharge',
      display:             'LCD de 10,4" sensível ao toque (português, inglês e espanhol)',
      protecoes:           'Disjuntor, IDR tipo A e DPS internos. Sobrecorrente, corrente residual, surtos elétricos, sobre e subtensão, sobre e subfrequência, sobre e subtemperatura, falhas de hardware, falha de comunicação com o veículo, falha de isolação, parada de emergência, deslocamento e nível de água. Medidor de energia CC classe 0,5. Gabinete em aço galvanizado. Certificação acreditada pelo Inmetro, executada pela PCN nº 3120260000600',
      temperaturaOperacao: '-30 °C a +50 °C',
      dimensoes:           '750 × 1790 × 720 mm (L × A × P)',
      peso:                '385 kg líquidos (446 kg brutos)',
      instalacao:          'Piso (içamento por olhal ou empilhadeira)',
      garantia:            '24 meses (3 meses de garantia padrão e 21 meses contratuais)',
    },
  },
]

// ── preço da loja ─────────────────────────────────────────────────────────────

interface PrecoLoja {
  price: number
  tiers: Record<string, number>
  image: string | null
  ncm: string
  nsegmento: string
  manufacturerId: string
}

/**
 * Preço e metadados da loja para os SKUs que existem no ERP. Busca sem filtro de
 * status: cinco dos DC estão com `status: 0` e não sairiam numa busca comum.
 * Falha de rede não derruba o seed — o produto entra sem preço, para ser digitado.
 */
async function precosDaLoja(skus: string[]): Promise<Record<string, PrecoLoja>> {
  const out: Record<string, PrecoLoja> = {}
  if (!BASE || !TOKEN) {
    console.warn('! MAGENTO_URL/MAGENTO_TOKEN ausentes — produtos novos entram com preço zero')
    return out
  }

  const sp = new URLSearchParams()
  sp.set('searchCriteria[filter_groups][0][filters][0][field]',          'sku')
  sp.set('searchCriteria[filter_groups][0][filters][0][value]',          skus.join(','))
  sp.set('searchCriteria[filter_groups][0][filters][0][condition_type]', 'in')
  sp.set('searchCriteria[pageSize]', String(skus.length))
  sp.set('fields', 'items[sku,price,tier_prices,media_gallery_entries,custom_attributes]')

  try {
    const res = await fetch(`${BASE}/rest/V1/products?${sp}`, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) throw new Error(`Magento HTTP ${res.status}`)
    const data = await res.json()

    for (const p of data.items ?? []) {
      const attrDe = (code: string) =>
        p.custom_attributes?.find((a: { attribute_code: string }) => a.attribute_code === code)?.value ?? ''

      const tiers: Record<string, number> = {}
      for (const t of p.tier_prices ?? []) {
        if (t.qty <= 1 && t.value > 0) tiers[String(t.customer_group_id)] = t.value
      }

      const entry =
        p.media_gallery_entries?.find((m: { disabled?: boolean; types?: string[]; file?: string }) =>
          !m.disabled && m.types?.includes('image') && m.file) ??
        p.media_gallery_entries?.find((m: { disabled?: boolean; file?: string }) => !m.disabled && m.file)

      out[p.sku] = {
        price: Number(p.price) || 0,
        tiers,
        image: entry ? `${BASE}/media/catalog/product${entry.file}` : null,
        ncm: String(attrDe('ncm')),
        nsegmento: String(attrDe('nsegmento')),
        manufacturerId: String(attrDe('manufacturer')),
      }
    }
  } catch (e) {
    console.warn(`! Não foi possível ler os preços da loja: ${e instanceof Error ? e.message : e}`)
  }
  return out
}

/** Mesma regra do sync: menor tier de qtd. 1, ou o preço de tabela. */
function melhorPreco(base: number, tiers: Record<string, number>): number {
  const valores = Object.values(tiers)
  return valores.length ? Math.min(base, ...valores) : base
}

// ── execução ──────────────────────────────────────────────────────────────────

/** `--dry` lê o catálogo e a loja e mostra o que faria, sem gravar nada. */
const DRY = process.argv.includes('--dry')

async function main() {
  if (DRY) console.log('SIMULAÇÃO (--dry): nada será gravado no banco.\n')

  const skusDoErp = CARREGADORES.map(c => c.sku).filter(s => !s.startsWith('PROV-'))
  const loja = await precosDaLoja(skusDoErp)

  let criados = 0
  let atualizados = 0

  for (const c of CARREGADORES) {
    const existente = await prisma.product.findUnique({
      where: { sku: c.sku },
      select: { id: true, attributes: true },
    })

    const preco = loja[c.sku]
    const fonte = c.ressalva ? `${c.fonte} — ${c.ressalva}` : c.fonte

    // Atributos da loja que já existirem ficam de pé; a ficha entra por cima.
    const anteriores = (existente?.attributes ?? {}) as Prisma.JsonObject
    const attributes: Prisma.JsonObject = {
      ...anteriores,
      ...(preco
        ? {
            nsegmento:       preco.nsegmento,
            manufacturer_id: preco.manufacturerId,
            magento_price:   preco.price,
            image_url:       preco.image,
            ncm:             preco.ncm,
            tierPrices:      preco.tiers,
          }
        : {}),
      modelo:       c.modelo,
      potenciaKw:   c.potenciaKw,
      specs:        c.specs,
      specsManuais: true,
      specsFonte:   fonte,
    }

    if (existente) {
      // Preço local preservado: quem já está no catálogo pode ter sido ajustado à mão.
      if (!DRY) {
        await prisma.product.update({
          where: { sku: c.sku },
          data: {
            name:        c.nome,
            description: c.descricao,
            brand:       'Intelbras',
            category:    CATEGORIA,
            subcategory: c.subcategoria,
            attributes,
          },
        })
      }
      atualizados++
      console.log(`  ~ ${c.sku.padEnd(15)} ${c.modelo.padEnd(11)} ficha atualizada (${Object.keys(c.specs).length} campos)`)
    } else {
      const basePrice = preco ? melhorPreco(preco.price, preco.tiers) : 0
      if (!DRY) {
        await prisma.product.create({
          data: {
            sku:         c.sku,
            name:        c.nome,
            description: c.descricao,
            brand:       'Intelbras',
            category:    CATEGORIA,
            subcategory: c.subcategoria,
            basePrice,
            cost:        0,
            stock:       0,
            unit:        'un',
            active:      true,
            attributes,
            compatible:  [],
            required:    [],
            suggested:   [],
          },
        })
      }
      criados++
      const nota = basePrice > 0
        ? `preço da loja R$ ${basePrice.toFixed(2)}`
        : 'sem preço na loja — digitar à mão'
      console.log(`  + ${c.sku.padEnd(15)} ${c.modelo.padEnd(11)} criado (${nota})`)
    }
  }

  console.log(
    `\n${criados} ${DRY ? 'seria(m) criado(s)' : 'criado(s)'}, ` +
    `${atualizados} ${DRY ? 'seria(m) atualizado(s)' : 'atualizado(s)'}, categoria "${CATEGORIA}".`,
  )

  const provisorios = CARREGADORES.filter(c => c.sku.startsWith('PROV-'))
  if (provisorios.length) {
    console.log(
      `\nSKU provisório (trocar pelo código do ERP quando for cadastrado): ` +
      provisorios.map(c => `${c.sku} = ${c.modelo}`).join(', '),
    )
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
