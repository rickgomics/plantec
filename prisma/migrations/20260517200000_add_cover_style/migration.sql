-- AlterTable (safe: no-op if column already exists)
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "coverStyle" TEXT NOT NULL DEFAULT 'teal';
