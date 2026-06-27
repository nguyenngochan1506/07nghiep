-- Add richer source metadata collected by the job crawler.
ALTER TABLE "Organization"
  ADD COLUMN "sourceSite" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "companyType" TEXT,
  ADD COLUMN "workingDays" TEXT,
  ADD COLUMN "overtimePolicy" TEXT,
  ADD COLUMN "coverImageUrl" TEXT,
  ADD COLUMN "linkedinUrl" TEXT,
  ADD COLUMN "jobOpeningsCount" INTEGER,
  ADD COLUMN "rawPayload" JSONB;

ALTER TABLE "Job"
  ADD COLUMN "industry" TEXT,
  ADD COLUMN "salaryCurrency" TEXT,
  ADD COLUMN "salaryUnit" TEXT,
  ADD COLUMN "sourcePublishedAt" TIMESTAMP(3),
  ADD COLUMN "experienceMonths" INTEGER,
  ADD COLUMN "streetAddress" TEXT,
  ADD COLUMN "addressLocality" TEXT,
  ADD COLUMN "addressRegion" TEXT,
  ADD COLUMN "addressCountry" TEXT,
  ADD COLUMN "directApply" BOOLEAN,
  ADD COLUMN "applicantLocation" TEXT;

CREATE INDEX "Organization_sourceSite_externalId_idx" ON "Organization"("sourceSite", "externalId");
CREATE INDEX "Organization_sourceUrl_idx" ON "Organization"("sourceUrl");
