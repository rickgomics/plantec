-- Tabela de preço escolhida pelo projetista, e rastro de onde saiu o preço
-- de cada item. Colunas opcionais: propostas e itens existentes ficam com
-- NULL, que o app lê como "preço de tabela da loja".
ALTER TABLE "Proposal"     ADD COLUMN IF NOT EXISTS "priceTable" TEXT;
ALTER TABLE "ProposalItem" ADD COLUMN IF NOT EXISTS "priceTable" TEXT;
ALTER TABLE "ProposalItem" ADD COLUMN IF NOT EXISTS "pricedAt"   TIMESTAMP(3);
