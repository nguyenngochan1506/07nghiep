ALTER TABLE "BusinessApplication"
ADD COLUMN "companySize" "CompanySize",
ADD COLUMN "foundedYear" INTEGER,
ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "taxCode" TEXT,
ADD COLUMN "legalRepresentative" TEXT,
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "contactPhone" TEXT,
ADD COLUMN "legalDocumentUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
