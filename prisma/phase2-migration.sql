-- ============================================================
-- PLANTEC BOM BUILDER — Fase 2: Perfis, Capa, Cenário
-- Execute no Neon/Supabase Console > SQL Editor
-- ============================================================

-- 1. Tabela CompanyProfile
CREATE TABLE IF NOT EXISTS "CompanyProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'plantec',
    "logoBase64" TEXT,
    "description" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- 2. Novos campos na tabela Proposal
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "coverProfileId" TEXT;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "introProfileId" TEXT;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "scenarioDesc" TEXT;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "scenarioDiagram" TEXT;

-- 3. Chaves estrangeiras

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Proposal_coverProfileId_fkey') THEN
    ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_coverProfileId_fkey"
      FOREIGN KEY ("coverProfileId") REFERENCES "CompanyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Proposal_introProfileId_fkey') THEN
    ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_introProfileId_fkey"
      FOREIGN KEY ("introProfileId") REFERENCES "CompanyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. RLS para CompanyProfile
ALTER TABLE "CompanyProfile" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'CompanyProfile' AND policyname = 'service_full_access'
  ) THEN
    CREATE POLICY "service_full_access" ON "CompanyProfile" FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Seed: Perfil Plantec padrão
INSERT INTO "CompanyProfile" ("id","name","type","description","website","phone","email","active","createdAt","updatedAt")
VALUES (
  'profile_plantec_01',
  'Plantec Distribuidora',
  'plantec',
  'A Plantec Distribuidora é especializada em soluções de segurança eletrônica, redes e infraestrutura tecnológica. Com mais de 15 anos de experiência, atendemos empresas de todos os portes com produtos de alta qualidade e suporte técnico especializado.',
  'https://www.plantec.com.br',
  '(11) 3333-4444',
  'comercial@plantec.com.br',
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Verificar:
SELECT 'CompanyProfile' as tabela, COUNT(*) as total FROM "CompanyProfile";
