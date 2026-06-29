-- CreateEnum
CREATE TYPE "VoucherDiscountType" AS ENUM ('PERCENT', 'FIXED_AMOUNT');

-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN "voucherId" TEXT,
ADD COLUMN "originalAmountVnd" INTEGER,
ADD COLUMN "discountAmountVnd" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "VoucherDiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "maxDiscountVnd" INTEGER,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "perUserLimit" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherPlan" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,

    CONSTRAINT "VoucherPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherRedemption" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discountAmountVnd" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");

-- CreateIndex
CREATE INDEX "Voucher_active_startsAt_expiresAt_idx" ON "Voucher"("active", "startsAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "VoucherPlan_voucherId_planId_key" ON "VoucherPlan"("voucherId", "planId");

-- CreateIndex
CREATE INDEX "VoucherPlan_planId_idx" ON "VoucherPlan"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "VoucherRedemption_paymentId_key" ON "VoucherRedemption"("paymentId");

-- CreateIndex
CREATE INDEX "VoucherRedemption_voucherId_createdAt_idx" ON "VoucherRedemption"("voucherId", "createdAt");

-- CreateIndex
CREATE INDEX "VoucherRedemption_userId_voucherId_idx" ON "VoucherRedemption"("userId", "voucherId");

-- CreateIndex
CREATE INDEX "Payment_voucherId_idx" ON "Payment"("voucherId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherPlan" ADD CONSTRAINT "VoucherPlan_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherPlan" ADD CONSTRAINT "VoucherPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
