-- Data em que o BOM ficou pronto (PDF gerado), 17/10/2026. As que já tinham
-- passado de "generated" ganham o envio ou a última alteração como
-- aproximação — o app não guardava essa hora antes.
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "generatedAt" TIMESTAMP(3);
UPDATE "Proposal" SET "generatedAt" = COALESCE("sentAt", "updatedAt")
 WHERE "generatedAt" IS NULL AND status IN ('generated', 'sent', 'approved', 'rejected');
