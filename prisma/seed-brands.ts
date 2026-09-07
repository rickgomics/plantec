/**
 * Seed script: reset and recreate manufacturer brand profiles.
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-brands.ts
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

// ── helpers ───────────────────────────────────────────────────────────────────

function png(filePath: string): string {
  return `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`
}

function svg(filePath: string): string {
  return `data:image/svg+xml;base64,${fs.readFileSync(filePath).toString('base64')}`
}

// ── brand data ────────────────────────────────────────────────────────────────

const BRANDS = [
  {
    name: 'Intelbras',
    logo: png('/tmp/logo_intelbras_wiki.png'),
    description:
      'Líder brasileira em segurança eletrônica, redes e comunicação — câmeras IP e HDCVI, gravadores DVR/NVR, centrais de alarme, interfones, switches PoE e soluções Wi-Fi para projetos residenciais, comerciais e industriais.',
    website: 'https://www.intelbras.com',
  },
  {
    name: 'CommScope',
    logo: svg('/tmp/logo_commscope.bin'),
    description:
      'Referência global em infraestrutura de redes — sistemas de cabeamento estruturado SYSTIMAX, fibra óptica, patch panels, racks e soluções de conectividade para data centers, redes corporativas e plantas industriais.',
    website: 'https://www.commscope.com',
  },
  {
    name: 'Legrand',
    logo: png('/tmp/logo_legrand.bin'),
    description:
      'Especialista francês em infraestrutura elétrica e digital — eletrocalhas, bandejas porta-cabos, tomadas, disjuntores, sistemas de gerenciamento de energia e soluções de automação predial para ambientes comerciais e industriais.',
    website: 'https://www.legrand.com',
  },
  {
    name: 'Prysmian',
    logo: png('/tmp/logo_prysmian_wiki.png'),
    description:
      'Maior fabricante mundial de cabos e sistemas de cabos — cabos de energia, cabos de telecomunicações, fibra óptica monomodo/multimodo, cabos industriais e soluções completas para infraestrutura de redes e energia.',
    website: 'https://www.prysmian.com',
  },
  {
    name: 'Nexans',
    logo: png('/tmp/logo_nexans_wiki.png'),
    description:
      'Fabricante global de cabos de alta performance — cabos de cobre Cat5e/Cat6/Cat6A, cabos de fibra óptica, cabos de energia e soluções de cabeamento estruturado certificado para data centers, hospitais e infraestrutura crítica.',
    website: 'https://www.nexans.com',
  },
  {
    name: 'Fanvil',
    logo: png('/tmp/logo_fanvil.bin'),
    description:
      'Fabricante chinês especializado em terminais VoIP e comunicação IP — telefones SIP corporativos, interfones IP, videophones, headsets e soluções de comunicação unificada compatíveis com 3CX, FreePBX e Asterisk.',
    website: 'https://www.fanvil.com',
  },
  {
    name: '3CX',
    logo: png('/tmp/logo_3cx_wiki.png'),
    description:
      'Plataforma de comunicação unificada baseada em software — PABX IP, videoconferência, chat corporativo, aplicativo móvel e integração CRM. Substitui sistemas de telefonia legados com solução on-premise ou em nuvem de baixo custo operacional.',
    website: 'https://www.3cx.com',
  },
  {
    name: 'FiberHome',
    logo: png('/tmp/logo_fiberhome.bin'),
    description:
      'Líder chinês em soluções de fibra óptica e redes de telecomunicações — OLTs, ONTs, switches de acesso, cabos ópticos, equipamentos DWDM e infraestrutura completa para redes FTTH, FTTB e backbone corporativo.',
    website: 'https://www.fiberhome.com',
  },
]

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🧹  Removing existing brand profiles…')
  await prisma.companyProfile.deleteMany({ where: { type: 'brand' } })

  console.log('🏭  Creating brand profiles…')
  for (const b of BRANDS) {
    await prisma.companyProfile.create({
      data: {
        name: b.name,
        type: 'brand',
        logoBase64: b.logo,
        description: b.description,
        website: b.website,
        active: true,
      },
    })
    console.log(`   ✓ ${b.name}`)
  }

  console.log('✅  Done — 8 brands created.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
