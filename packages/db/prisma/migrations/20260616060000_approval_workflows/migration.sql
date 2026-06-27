-- CreateEnum
CREATE TYPE "OrganizationVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "verificationNote" TEXT,
ADD COLUMN     "verificationStatus" "OrganizationVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';
