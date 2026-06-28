-- CreateEnum
CREATE TYPE "BillingPlanCode" AS ENUM ('CANDIDATE_PLUS_MONTHLY', 'CANDIDATE_AI_CV_CREDITS', 'EMPLOYER_MONTHLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYOS');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'FAILED', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "BusinessApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "CandidateCvAnalysis"
ADD COLUMN "quotaSubscriptionId" TEXT;

-- CreateTable
CREATE TABLE "BillingPlan" (
    "id" TEXT NOT NULL,
    "code" "BillingPlanCode" NOT NULL,
    "name" TEXT NOT NULL,
    "priceVnd" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "aiCvQuotaLimit" INTEGER,
    "aiCvQuotaUsed" INTEGER NOT NULL DEFAULT 0,
    "lastRenewalReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "description" TEXT,
    "status" "BusinessApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "approvedPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "businessApplicationId" TEXT,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'PAYOS',
    "orderCode" BIGINT NOT NULL,
    "paymentLinkId" TEXT,
    "checkoutUrl" TEXT NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "providerPayload" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingPlan_code_key" ON "BillingPlan"("code");

-- CreateIndex
CREATE INDEX "BillingPlan_active_idx" ON "BillingPlan"("active");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_currentPeriodEnd_idx" ON "Subscription"("userId", "status", "currentPeriodEnd");

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessApplication_approvedPaymentId_key" ON "BusinessApplication"("approvedPaymentId");

-- CreateIndex
CREATE INDEX "BusinessApplication_userId_status_idx" ON "BusinessApplication"("userId", "status");

-- CreateIndex
CREATE INDEX "BusinessApplication_status_createdAt_idx" ON "BusinessApplication"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderCode_key" ON "Payment"("orderCode");

-- CreateIndex
CREATE INDEX "Payment_userId_status_createdAt_idx" ON "Payment"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_planId_idx" ON "Payment"("planId");

-- CreateIndex
CREATE INDEX "Payment_businessApplicationId_idx" ON "Payment"("businessApplicationId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessApplication" ADD CONSTRAINT "BusinessApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessApplication" ADD CONSTRAINT "BusinessApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_businessApplicationId_fkey" FOREIGN KEY ("businessApplicationId") REFERENCES "BusinessApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessApplication" ADD CONSTRAINT "BusinessApplication_approvedPaymentId_fkey" FOREIGN KEY ("approvedPaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
