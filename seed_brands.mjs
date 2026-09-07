import pkg from '@prisma/client'
const { PrismaClient } = pkg
const prisma = new PrismaClient()

const brands = [
  {
    name: 'Intelbras',
    description: 'Líder brasileiro em comunicação, segurança eletrônica e redes — câmeras IP/HDCVI, DVRs/NVRs, centrais de alarme, interfones e soluções de rede.',
    website: 'https://www.intelbras.com.br',
  },
  {
    name: 'WD (Western Digital)',
    description: 'Referência mundial em armazenamento de dados — HDDs Purple para vigilância 24/7, SSDs e sistemas NAS de alta capacidade e confiabilidade.',
    website: 'https://www.westerndigital.com',
  },
  {
    name: 'NHS Sistemas de Energia',
    description: 'Fabricante nacional de nobreaks, estabilizadores e inversores solares — proteção de energia para ambientes críticos de segurança e TI.',
    website: 'https://www.nhs.com.br',
  },
  {
    name: 'Furukawa Electric',
    description: 'Soluções completas de infraestrutura de redes — cabos estruturados Cat5e/Cat6/Cat6A, fibra óptica, racks e conectores de alta performance.',
    website: 'https://www.furukawa.com.br',
  },
  {
    name: 'Digisystem',
    description: 'Especialista em soluções de CFTV profissional — DVRs, câmeras analíticas e gravadores IP para projetos de monitoramento de grande porte.',
    website: 'https://www.digisystem.com.br',
  },
  {
    name: 'AMP Netconnect',
    description: 'Marca da TE Connectivity para infraestrutura de rede — cabos, conectores, painéis de patch e soluções de cabeamento estruturado certificado.',
    website: 'https://www.te.com/ampnetconnect',
  },
  {
    name: 'Hikvision',
    description: 'Maior fabricante mundial de equipamentos de videovigilância — câmeras IP, sistemas de gravação, controle de acesso e soluções de análise de vídeo por IA.',
    website: 'https://www.hikvision.com',
  },
  {
    name: 'Dahua Technology',
    description: 'Fabricante global de soluções de segurança eletrônica — câmeras Starlight/Thermal, NVRs, controle de acesso e sistemas de reconhecimento facial.',
    website: 'https://www.dahuasecurity.com',
  },
]

async function main() {
  console.log('Seeding brands...')
  let count = 0
  for (const b of brands) {
    const existing = await prisma.companyProfile.findFirst({ where: { name: b.name, type: 'brand' } })
    if (existing) {
      console.log(`  skip: ${b.name} (already exists)`)
      continue
    }
    await prisma.companyProfile.create({
      data: {
        name: b.name,
        type: 'brand',
        active: true,
        description: b.description,
        website: b.website,
      },
    })
    console.log(`  created: ${b.name}`)
    count++
  }
  console.log(`Done. ${count} brand(s) created.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
