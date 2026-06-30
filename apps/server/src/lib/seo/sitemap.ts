import type { PrismaClient } from "@07nghiep/db";

const MAX_DYNAMIC_URLS = 45_000;

export type PublicSitemapEntry = {
  type: "job" | "organization";
  id: string;
  lastmod: string | null;
};

export async function getPublicSitemapEntries(
  prisma: PrismaClient,
): Promise<PublicSitemapEntry[]> {
  const now = new Date();
  const indexableOpenJobWhere = {
    status: "OPEN" as const,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };

  const [jobs, organizations] = await Promise.all([
    prisma.job.findMany({
      where: indexableOpenJobWhere,
      select: { id: true, updatedAt: true, publishedAt: true },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: MAX_DYNAMIC_URLS,
    }),
    prisma.organization.findMany({
      where: {
        jobs: {
          some: indexableOpenJobWhere,
        },
      },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: MAX_DYNAMIC_URLS,
    }),
  ]);

  return [
    ...jobs.map((job) => ({
      type: "job" as const,
      id: job.id,
      lastmod: (job.updatedAt ?? job.publishedAt)?.toISOString() ?? null,
    })),
    ...organizations.map((organization) => ({
      type: "organization" as const,
      id: organization.id,
      lastmod: organization.updatedAt?.toISOString() ?? null,
    })),
  ];
}
