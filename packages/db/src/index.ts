import { env } from "@07nghiep/env/server";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../prisma/generated";
export { Prisma, ApplicationStatus, JobStatus } from "../prisma/generated";

export function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

export * from "../prisma/generated";
export { prisma };
export default prisma;
