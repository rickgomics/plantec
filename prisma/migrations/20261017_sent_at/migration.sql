-- Data de entrega do BOM (17/10/2026): primeira vez que a proposta virou
-- "sent". As que já tinham passado de "sent" ganham a última alteração como
-- aproximação — o app não guardava essa hora antes.
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
UPDATE "Proposal" SET "sentAt" = "updatedAt"
 WHERE "sentAt" IS NULL AND status IN ('sent', 'approved', 'rejected');
