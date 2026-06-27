import prisma from "@07nghiep/db";
import { sendRenewalReminders } from "../lib/billing/reminders";

async function main() {
  const result = await sendRenewalReminders({ prisma });
  console.log(`Sent ${result.sent} renewal reminders.`);
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
