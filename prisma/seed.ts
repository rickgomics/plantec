import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clean existing data
  await prisma.proposalItem.deleteMany()
  await prisma.proposal.deleteMany()
  await prisma.product.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.rule.deleteMany()

  // Products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: 'CAM-IP-POE-4MP',
        name: 'Camera IP PoE 4MP Dome',
        description: 'Camera IP dome 4MP com PoE, IR 30m, H.265, IP67',
        brand: 'Intelbras',
        category: 'CFTV',
        subcategory: 'Cameras IP',
        basePrice: new Decimal(380.00),
        cost: new Decimal(220.00),
        stock: 50,
        unit: 'un',
        attributes: {
          resolution: '4MP',
          interface: 'PoE',
          ir_range: '30m',
          codec: 'H.265',
          protection: 'IP67'
        },
        suggested: ['SW-POE-8P', 'NVR-8CH-4K', 'CAB-PATCH-5M'],
      }
    }),
    prisma.product.create({
      data: {
        sku: 'NVR-8CH-4K',
        name: 'NVR 8 Canais 4K',
        description: 'Gravador NVR 8 canais, resolucao 4K, suporte H.265, 1 HD',
        brand: 'Intelbras',
        category: 'CFTV',
        subcategory: 'Gravadores',
        basePrice: new Decimal(1200.00),
        cost: new Decimal(750.00),
        stock: 15,
        unit: 'un',
        attributes: {
          channels: 8,
          resolution: '4K',
          hd_bays: 1,
          codec: 'H.265'
        },
        required: ['HD-SURV-4TB'],
        suggested: ['HD-SURV-4TB', 'NO-BREAK-1200'],
      }
    }),
    prisma.product.create({
      data: {
        sku: 'NVR-16CH-4K',
        name: 'NVR 16 Canais 4K',
        description: 'Gravador NVR 16 canais, resolucao 4K, suporte H.265, 2 HDs',
        brand: 'Intelbras',
        category: 'CFTV',
        subcategory: 'Gravadores',
        basePrice: new Decimal(2100.00),
        cost: new Decimal(1300.00),
        stock: 8,
        unit: 'un',
        attributes: {
          channels: 16,
          resolution: '4K',
          hd_bays: 2,
          codec: 'H.265'
        },
        required: ['HD-SURV-4TB'],
        suggested: ['HD-SURV-4TB', 'NO-BREAK-1200'],
      }
    }),
    prisma.product.create({
      data: {
        sku: 'SW-POE-8P',
        name: 'Switch PoE 8 Portas Gerenciavel',
        description: 'Switch PoE+ 8 portas 10/100/1000, 2 uplinks SFP, 120W',
        brand: 'Intelbras',
        category: 'Redes',
        subcategory: 'Switches',
        basePrice: new Decimal(950.00),
        cost: new Decimal(580.00),
        stock: 20,
        unit: 'un',
        attributes: {
          ports: 8,
          poe: true,
          total_power: '120W',
          uplinks: 2,
          managed: true
        },
        suggested: ['CAB-PATCH-5M', 'RACK-12U'],
      }
    }),
    prisma.product.create({
      data: {
        sku: 'SW-POE-16P',
        name: 'Switch PoE 16 Portas Gerenciavel',
        description: 'Switch PoE+ 16 portas 10/100/1000, 2 uplinks SFP, 250W',
        brand: 'Intelbras',
        category: 'Redes',
        subcategory: 'Switches',
        basePrice: new Decimal(1800.00),
        cost: new Decimal(1100.00),
        stock: 12,
        unit: 'un',
        attributes: {
          ports: 16,
          poe: true,
          total_power: '250W',
          uplinks: 2,
          managed: true
        },
        suggested: ['CAB-PATCH-5M', 'RACK-12U'],
      }
    }),
    prisma.product.create({
      data: {
        sku: 'HD-SURV-4TB',
        name: 'HD Surveillance 4TB',
        description: 'HD para vigilancia 24/7, 4TB, 5400RPM, SATA',
        brand: 'Seagate',
        category: 'CFTV',
        subcategory: 'Armazenamento',
        basePrice: new Decimal(520.00),
        cost: new Decimal(320.00),
        stock: 30,
        unit: 'un',
        attributes: {
          capacity: '4TB',
          rpm: 5400,
          interface: 'SATA',
          workload: '180TB/year'
        },
      }
    }),
    prisma.product.create({
      data: {
        sku: 'RACK-12U',
        name: 'Rack 12U Parede 570mm',
        description: 'Rack de parede 12U, profundidade 570mm, com ventilacao',
        brand: 'Digisystem',
        category: 'Racks',
        subcategory: 'Rack Parede',
        basePrice: new Decimal(680.00),
        cost: new Decimal(380.00),
        stock: 10,
        unit: 'un',
        attributes: {
          units: 12,
          depth: '570mm',
          type: 'parede'
        },
        suggested: ['NO-BREAK-1200', 'CAB-PATCH-5M'],
      }
    }),
    prisma.product.create({
      data: {
        sku: 'NO-BREAK-1200',
        name: 'Nobreak 1200VA Senoidal',
        description: 'Nobreak 1200VA/720W, saida senoidal, 8 tomadas, USB',
        brand: 'NHS',
        category: 'Nobreaks',
        subcategory: 'Nobreak Senoidal',
        basePrice: new Decimal(1450.00),
        cost: new Decimal(880.00),
        stock: 18,
        unit: 'un',
        attributes: {
          va: 1200,
          watts: 720,
          output: 'senoidal',
          outlets: 8,
          usb: true
        },
      }
    }),
    prisma.product.create({
      data: {
        sku: 'CAB-PATCH-5M',
        name: 'Patch Cord Cat6 5m',
        description: 'Cabo patch cord Cat6, 5 metros, azul, certificado',
        brand: 'Furukawa',
        category: 'Cabeamento',
        subcategory: 'Patch Cord',
        basePrice: new Decimal(28.00),
        cost: new Decimal(12.00),
        stock: 200,
        unit: 'un',
        attributes: {
          category: 'Cat6',
          length: '5m',
          color: 'azul'
        },
      }
    }),
    prisma.product.create({
      data: {
        sku: 'SRV-CONFIG-CFTV',
        name: 'Servico de Configuracao CFTV',
        description: 'Servico de configuracao e comissionamento de sistema CFTV',
        brand: 'Plantec',
        category: 'Servicos',
        subcategory: 'Configuracao',
        basePrice: new Decimal(500.00),
        cost: new Decimal(250.00),
        stock: 999,
        unit: 'serv',
        attributes: {
          duration: '4h',
          remote: false,
          warranty: '90 dias'
        },
      }
    })
  ])

  console.log(`Created ${products.length} products`)

  // Customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        companyName: 'Supermercados Bom Preco Ltda',
        tradeName: 'Bom Preco',
        cnpj: '12.345.678/0001-90',
        contactName: 'Joao Silva',
        email: 'joao.silva@bompreco.com.br',
        phone: '(11) 99123-4567',
        city: 'Sao Paulo',
        state: 'SP'
      }
    }),
    prisma.customer.create({
      data: {
        companyName: 'Construtora Horizonte S.A.',
        tradeName: 'Horizonte',
        cnpj: '98.765.432/0001-10',
        contactName: 'Maria Santos',
        email: 'maria@horizonte.com.br',
        phone: '(11) 3456-7890',
        city: 'Campinas',
        state: 'SP'
      }
    }),
    prisma.customer.create({
      data: {
        companyName: 'Hospital Sao Lucas S/A',
        tradeName: 'HSL',
        cnpj: '11.222.333/0001-44',
        contactName: 'Carlos Mendes',
        email: 'carlos.mendes@hsl.org.br',
        phone: '(11) 4567-8901',
        city: 'Sao Paulo',
        state: 'SP'
      }
    })
  ])

  console.log(`Created ${customers.length} customers`)

  // Rules
  const rules = await Promise.all([
    prisma.rule.create({
      data: {
        name: 'Camera PoE -> Sugerir Switch PoE',
        description: 'Ao adicionar camera PoE, sugerir switch PoE compativel',
        type: 'suggestion',
        condition: { category: 'CFTV', attribute: 'interface', value: 'PoE' },
        action: { type: 'suggest', skus: ['SW-POE-8P', 'SW-POE-16P'], message: 'Cameras PoE detectadas. Adicione um switch PoE.' },
        priority: 10
      }
    }),
    prisma.rule.create({
      data: {
        name: 'Cameras > 8 -> Sugerir NVR 16 canais',
        description: 'Quando houver mais de 8 cameras, sugerir NVR de 16 canais',
        type: 'suggestion',
        condition: { category: 'CFTV', subcategory: 'Cameras IP', quantityGt: 8 },
        action: { type: 'suggest', skus: ['NVR-16CH-4K'], message: 'Mais de 8 cameras detectadas. Recomendamos NVR 16 canais.' },
        priority: 20
      }
    }),
    prisma.rule.create({
      data: {
        name: 'NVR -> HD Obrigatorio',
        description: 'Ao adicionar NVR, HD surveillance e obrigatorio',
        type: 'required',
        condition: { category: 'CFTV', subcategory: 'Gravadores' },
        action: { type: 'require', skus: ['HD-SURV-4TB'], message: 'NVR detectado. HD Surveillance e obrigatorio.' },
        priority: 30
      }
    }),
    prisma.rule.create({
      data: {
        name: 'Rack -> Sugerir Nobreak',
        description: 'Ao adicionar rack, sugerir nobreak para protecao dos equipamentos',
        type: 'suggestion',
        condition: { category: 'Racks' },
        action: { type: 'suggest', skus: ['NO-BREAK-1200'], message: 'Rack detectado. Recomendamos nobreak para protecao.' },
        priority: 10
      }
    }),
    prisma.rule.create({
      data: {
        name: 'Margem < 10% -> Alerta',
        description: 'Alertar quando a margem global da proposta ficar abaixo de 10%',
        type: 'alert',
        condition: { marginLt: 10 },
        action: { type: 'alert', severity: 'warning', message: 'Margem da proposta abaixo de 10%. Revise os descontos.' },
        priority: 50
      }
    })
  ])

  console.log(`Created ${rules.length} rules`)
  console.log('Seed completed!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
