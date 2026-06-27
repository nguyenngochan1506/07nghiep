import prisma from "@07nghiep/db";
import { expireSubscriptions } from "../lib/billing/expiration";

async function main() {
  const result = await expireSubscriptions({ prisma });
  console.log(
    `Expired ${result.expiredSubscriptions} subscriptions; downgraded ${result.downgradedEmployers} employers.`,
  );
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
