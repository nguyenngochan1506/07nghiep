import prisma from "@07nghiep/db";
import { DEFAULT_BILLING_PLANS } from "../lib/billing/plans";

async function main() {
  for (const plan of DEFAULT_BILLING_PLANS) {
    await prisma.billingPlan.upsert({
      where: { code: plan.code },
      create: {
        code: plan.code,
        name: plan.name,
        priceVnd: plan.priceVnd,
        durationDays: plan.durationDays,
        active: true,
      },
      update: {
        name: plan.name,
        priceVnd: plan.priceVnd,
        durationDays: plan.durationDays,
        active: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
