-- AlterTable
ALTER TABLE "Job"
ADD COLUMN "sourceSite" TEXT,
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "externalId" TEXT,
ADD COLUMN "crawledAt" TIMESTAMP(3),
ADD COLUMN "rawPayload" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Job_sourceUrl_key" ON "Job"("sourceUrl");

-- CreateIndex
CREATE INDEX "Job_sourceSite_externalId_idx" ON "Job"("sourceSite", "externalId");

-- CreateIndex
CREATE INDEX "Job_crawledAt_idx" ON "Job"("crawledAt");
