-- ============================================================
-- PLANTEC BOM BUILDER — Setup completo para Neon PostgreSQL
-- Cole este arquivo inteiro no Neon Console > SQL Editor
-- ============================================================

-- 1. TABELAS -----------------------------------------------

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'seller',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "basePrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "compatible" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "required" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suggested" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "tradeName" TEXT,
    "cnpj" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Proposal" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "customerId" TEXT NOT NULL,
    "userId" TEXT,
    "executiveSummary" TEXT,
    "scope" TEXT,
    "commercialTerms" TEXT,
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalDiscount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "margin" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProposalItem" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "margin" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "role" TEXT,
    "technicalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProposalItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Rule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "action" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- Tabela interna do Prisma para controle de migrations
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

-- 2. ÍNDICES ÚNICOS ----------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product"("sku");
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_cnpj_key" ON "Customer"("cnpj");
CREATE UNIQUE INDEX IF NOT EXISTS "Proposal_number_key" ON "Proposal"("number");

-- 3. CHAVES ESTRANGEIRAS -----------------------------------

ALTER TABLE "Proposal"
    ADD CONSTRAINT IF NOT EXISTS "Proposal_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Proposal"
    ADD CONSTRAINT IF NOT EXISTS "Proposal_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProposalItem"
    ADD CONSTRAINT IF NOT EXISTS "ProposalItem_proposalId_fkey"
    FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProposalItem"
    ADD CONSTRAINT IF NOT EXISTS "ProposalItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. REGISTRO DA MIGRATION NO PRISMA ----------------------

INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count")
VALUES ('1','placeholder',NOW(),'20260517112615_init',NULL,NULL,NOW(),1)
ON CONFLICT DO NOTHING;

-- 5. SEED: PRODUTOS ----------------------------------------

INSERT INTO "Product" ("id","sku","name","description","brand","category","subcategory","basePrice","cost","stock","unit","active","attributes","suggested","required","compatible","createdAt","updatedAt") VALUES
('prod_01','CAM-IP-POE-4MP','Câmera IP PoE 4MP Dome','Câmera IP dome 4MP com PoE, IR 30m, H.265, IP67','Intelbras','CFTV','Câmeras IP',380.00,220.00,50,'un',true,'{"resolution":"4MP","interface":"PoE","ir_range":"30m","codec":"H.265","protection":"IP67"}',ARRAY['SW-POE-8P','NVR-8CH-4K','CAB-PATCH-5M'],ARRAY[]::TEXT[],ARRAY[]::TEXT[],NOW(),NOW()),
('prod_02','NVR-8CH-4K','NVR 8 Canais 4K','Gravador NVR 8 canais, resolução 4K, suporte H.265, 1 HD','Intelbras','CFTV','Gravadores',1200.00,750.00,15,'un',true,'{"channels":8,"resolution":"4K","hd_bays":1,"codec":"H.265"}',ARRAY['HD-SURV-4TB','NO-BREAK-1200'],ARRAY['HD-SURV-4TB'],ARRAY[]::TEXT[],NOW(),NOW()),
('prod_03','NVR-16CH-4K','NVR 16 Canais 4K','Gravador NVR 16 canais, resolução 4K, suporte H.265, 2 HDs','Intelbras','CFTV','Gravadores',2100.00,1300.00,8,'un',true,'{"channels":16,"resolution":"4K","hd_bays":2,"codec":"H.265"}',ARRAY['HD-SURV-4TB','NO-BREAK-1200'],ARRAY['HD-SURV-4TB'],ARRAY[]::TEXT[],NOW(),NOW()),
('prod_04','SW-POE-8P','Switch PoE 8 Portas Gerenciável','Switch PoE+ 8 portas 10/100/1000, 2 uplinks SFP, 120W','Intelbras','Redes','Switches',950.00,580.00,20,'un',true,'{"ports":8,"poe":true,"total_power":"120W","uplinks":2,"managed":true}',ARRAY['CAB-PATCH-5M','RACK-12U'],ARRAY[]::TEXT[],ARRAY[]::TEXT[],NOW(),NOW()),
('prod_05','SW-POE-16P','Switch PoE 16 Portas Gerenciável','Switch PoE+ 16 portas 10/100/1000, 2 uplinks SFP, 250W','Intelbras','Redes','Switches',1800.00,1100.00,12,'un',true,'{"ports":16,"poe":true,"total_power":"250W","uplinks":2,"managed":true}',ARRAY['CAB-PATCH-5M','RACK-12U'],ARRAY[]::TEXT[],ARRAY[]::TEXT[],NOW(),NOW()),
('prod_06','HD-SURV-4TB','HD Surveillance 4TB','HD para vigilância 24/7, 4TB, 5400RPM, SATA','Seagate','CFTV','Armazenamento',520.00,320.00,30,'un',true,'{"capacity":"4TB","rpm":5400,"interface":"SATA","workload":"180TB/year"}',ARRAY[]::TEXT[],ARRAY[]::TEXT[],ARRAY[]::TEXT[],NOW(),NOW()),
('prod_07','RACK-12U','Rack 12U Parede 570mm','Rack de parede 12U, profundidade 570mm, com ventilação','Digisystem','Racks','Rack Parede',680.00,380.00,10,'un',true,'{"units":12,"depth":"570mm","type":"parede"}',ARRAY['NO-BREAK-1200','CAB-PATCH-5M'],ARRAY[]::TEXT[],ARRAY[]::TEXT[],NOW(),NOW()),
('prod_08','NO-BREAK-1200','Nobreak 1200VA Senoidal','Nobreak 1200VA/720W, saída senoidal, 8 tomadas, USB','NHS','Nobreaks','Nobreak Senoidal',1450.00,880.00,18,'un',true,'{"va":1200,"watts":720,"output":"senoidal","outlets":8,"usb":true}',ARRAY[]::TEXT[],ARRAY[]::TEXT[],ARRAY[]::TEXT[],NOW(),NOW()),
('prod_09','CAB-PATCH-5M','Patch Cord Cat6 5m','Cabo patch cord Cat6, 5 metros, azul, certificado','Furukawa','Cabeamento','Patch Cord',28.00,12.00,200,'un',true,'{"category":"Cat6","length":"5m","color":"azul"}',ARRAY[]::TEXT[],ARRAY[]::TEXT[],ARRAY[]::TEXT[],NOW(),NOW()),
('prod_10','SRV-CONFIG-CFTV','Serviço de Configuração CFTV','Serviço de configuração e comissionamento de sistema CFTV','Plantec','Serviços','Configuração',500.00,250.00,999,'serv',true,'{"duration":"4h","remote":false,"warranty":"90 dias"}',ARRAY[]::TEXT[],ARRAY[]::TEXT[],ARRAY[]::TEXT[],NOW(),NOW())
ON CONFLICT (sku) DO NOTHING;

-- 6. SEED: CLIENTES ----------------------------------------

INSERT INTO "Customer" ("id","companyName","tradeName","cnpj","contactName","email","phone","city","state","active","createdAt","updatedAt") VALUES
('cust_01','Supermercados Bom Preço Ltda','Bom Preço','12.345.678/0001-90','João Silva','joao.silva@bompreco.com.br','(11) 99123-4567','São Paulo','SP',true,NOW(),NOW()),
('cust_02','Construtora Horizonte S.A.','Horizonte','98.765.432/0001-10','Maria Santos','maria@horizonte.com.br','(11) 3456-7890','Campinas','SP',true,NOW(),NOW()),
('cust_03','Hospital São Lucas S/A','HSL','11.222.333/0001-44','Carlos Mendes','carlos.mendes@hsl.org.br','(11) 4567-8901','São Paulo','SP',true,NOW(),NOW())
ON CONFLICT (cnpj) DO NOTHING;

-- 7. SEED: REGRAS ------------------------------------------

INSERT INTO "Rule" ("id","name","description","type","condition","action","priority","active","createdAt","updatedAt") VALUES
('rule_01','Câmera PoE → Sugerir Switch PoE','Ao adicionar câmera PoE, sugerir switch PoE compatível','suggestion','{"category":"CFTV","attribute":"interface","value":"PoE"}','{"type":"suggest","skus":["SW-POE-8P","SW-POE-16P"],"message":"Câmeras PoE detectadas. Adicione um switch PoE."}',10,true,NOW(),NOW()),
('rule_02','Câmeras > 8 → Sugerir NVR 16ch','Quando houver mais de 8 câmeras, sugerir NVR de 16 canais','suggestion','{"category":"CFTV","subcategory":"Câmeras IP","quantityGt":8}','{"type":"suggest","skus":["NVR-16CH-4K"],"message":"Mais de 8 câmeras detectadas. Recomendamos NVR 16 canais."}',20,true,NOW(),NOW()),
('rule_03','NVR → HD Obrigatório','Ao adicionar NVR, HD surveillance é obrigatório','required','{"category":"CFTV","subcategory":"Gravadores"}','{"type":"require","skus":["HD-SURV-4TB"],"message":"NVR detectado. HD Surveillance é obrigatório."}',30,true,NOW(),NOW()),
('rule_04','Rack → Sugerir Nobreak','Ao adicionar rack, sugerir nobreak para proteção','suggestion','{"category":"Racks"}','{"type":"suggest","skus":["NO-BREAK-1200"],"message":"Rack detectado. Recomendamos nobreak para proteção."}',10,true,NOW(),NOW()),
('rule_05','Margem < 10% → Alerta','Alertar quando margem global ficar abaixo de 10%','alert','{"marginLt":10}','{"type":"alert","severity":"warning","message":"Margem da proposta abaixo de 10%. Revise os descontos."}',50,true,NOW(),NOW())
ON CONFLICT DO NOTHING;

-- Pronto! Verifique os dados:
SELECT 'Products' as tabela, COUNT(*) as total FROM "Product"
UNION ALL SELECT 'Customers', COUNT(*) FROM "Customer"
UNION ALL SELECT 'Rules', COUNT(*) FROM "Rule";
