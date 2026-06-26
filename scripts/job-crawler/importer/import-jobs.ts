import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createPrismaClient, type Prisma } from "../../../packages/db/src/index";
import { env } from "../../../packages/env/src/server";

import {
  type AccountManifestEntry,
  buildEmployerEmail,
  escapeCsvValue,
  generatePassword,
  mapCompanySize,
  mapExperienceLevel,
  mapJobType,
  mapSalary,
  mapWorkType,
  mergeAccountManifest,
  normalizeSkills,
  stableExternalId,
} from "./normalize";

type CrawledJobRecord = {
  sourceSite: string;
  sourceUrl: string;
  externalId?: string | null;
  title: string;
  companyName: string;
  sourceCompanyUrl?: string | null;
  companyLogoUrl?: string | null;
  companyDescription?: string | null;
  companyWebsite?: string | null;
  companyIndustry?: string | null;
  companySize?: string | null;
  companyType?: string | null;
  companyCountry?: string | null;
  companyLocation?: string | null;
  companyWorkingDays?: string | null;
  companyOvertimePolicy?: string | null;
  companyCoverImageUrl?: string | null;
  companyLinkedinUrl?: string | null;
  companyJobOpeningsCount?: number | null;
  companyRaw?: unknown;
  location?: string | null;
  description?: string | null;
  requirements?: string | null;
  benefits?: string | null;
  salary?: {
    min?: string | number | null;
    max?: string | number | null;
    unit?: string | null;
    currency?: string | null;
    value?: string | null;
    isNegotiable?: boolean | string | number | null;
  } | null;
  jobIndustry?: string | null;
  jobType?: string | null;
  workType?: string | null;
  experienceLevel?: string | null;
  experienceMonths?: number | null;
  datePosted?: string | null;
  validThrough?: string | null;
  salaryCurrency?: string | null;
  salaryUnit?: string | null;
  streetAddress?: string | null;
  addressLocality?: string | null;
  addressRegion?: string | null;
  addressCountry?: string | null;
  directApply?: boolean | null;
  applicantLocation?: string | null;
  skills?: string[];
  crawledAt?: string | null;
  raw?: unknown;
};

type ImportArgs = {
  inputs: string[];
  outDir: string;
  limit?: number;
  dryRun: boolean;
};

// biome-ignore lint/suspicious/noUndeclaredEnvVars: pnpm sets INIT_CWD so paths resolve from the caller's directory.
const baseDir = process.env.INIT_CWD ?? process.cwd();

function resolveFromBase(value: string) {
  return path.isAbsolute(value) ? value : path.resolve(baseDir, value);
}

function parseArgs(argv: string[]): ImportArgs {
  const inputs: string[] = [];
  let outDir = "data/crawled-jobs";
  let limit: number | undefined;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--input") {
      const value = argv[index + 1];
      if (!value) throw new Error("--input requires a file path");
      inputs.push(value);
      index += 1;
    } else if (arg === "--out-dir") {
      const value = argv[index + 1];
      if (!value) throw new Error("--out-dir requires a directory path");
      outDir = value;
      index += 1;
    } else if (arg === "--limit") {
      const value = argv[index + 1];
      if (!value) throw new Error("--limit requires a number");
      limit = Number(value);
      if (!Number.isInteger(limit) || limit < 1)
        throw new Error("--limit must be a positive integer");
      index += 1;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg ?? ""}`);
    }
  }

  return { inputs: inputs.map(resolveFromBase), outDir: resolveFromBase(outDir), limit, dryRun };
}

async function defaultInputFiles(outDir: string) {
  const entries = await readdir(outDir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".jsonl") &&
        !entry.name.startsWith("employer-accounts"),
    )
    .map((entry) => path.join(outDir, entry.name))
    .sort();
}

async function readJsonl(filePath: string) {
  const content = await readFile(filePath, "utf-8");
  const records: CrawledJobRecord[] = [];

  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed) as CrawledJobRecord);
    } catch (error) {
      throw new Error(`Invalid JSONL at ${filePath}:${index + 1}: ${(error as Error).message}`);
    }
  }

  return records;
}

async function readPreviousManifest(outDir: string) {
  const manifestPath = path.join(outDir, "employer-accounts.json");
  const content = await readFile(manifestPath, "utf-8").catch(() => "[]");
  try {
    const parsed = JSON.parse(content) as AccountManifestEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function trimTo(value: string, max: number) {
  return value.length > max ? value.slice(0, max).trim() : value;
}

function optionalTrim(value: string | null | undefined, max: number) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimTo(trimmed, max) : undefined;
}

function validRecord(record: CrawledJobRecord) {
  return Boolean(record.sourceSite && record.sourceUrl && record.title && record.companyName);
}

function normalizeDescription(record: CrawledJobRecord) {
  const description = (record.description ?? "").trim();
  if (description.length >= 50) return description;
  return `${record.title} tại ${record.companyName}. Thông tin được tổng hợp từ ${record.sourceSite}.`;
}

async function signUpEmployer(email: string, password: string, name: string) {
  const response = await fetch(`${env.BETTER_AUTH_URL.replace(/\/$/, "")}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: env.CORS_ORIGIN[0] ?? env.BETTER_AUTH_URL,
    },
    body: JSON.stringify({
      email,
      password,
      name,
      confirmPassword: password,
    }),
  });

  if (response.ok) {
    return;
  }

  const data = (await response.json().catch(() => ({}))) as { message?: string };
  const message = typeof data.message === "string" ? data.message : JSON.stringify(data);
  if (/already|exists|conflict/i.test(message)) {
    return;
  }

  throw new Error(`Failed to create Better Auth account for ${email}: ${message}`);
}

function toRawPayload(record: CrawledJobRecord): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(record)) as Prisma.InputJsonValue;
}

function toOrganizationRawPayload(record: CrawledJobRecord): Prisma.InputJsonValue | undefined {
  const payload = {
    sourceSite: record.sourceSite,
    companyName: record.companyName,
    sourceCompanyUrl: record.sourceCompanyUrl,
    companyRaw: record.companyRaw,
    raw: record.raw,
  };
  return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
}

function parseDate(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function companySizeFromRaw(raw: unknown) {
  const company = (raw as { embedded?: { company?: { company_size?: unknown } } } | undefined)
    ?.embedded?.company;
  const value = typeof company?.company_size === "string" ? company.company_size : "";
  const numeric = Number(value.replace(/[^\d]/g, ""));
  if (numeric >= 1000) return "ENTERPRISE" as const;
  if (numeric >= 250) return "LARGE" as const;
  if (numeric >= 50) return "MEDIUM" as const;
  if (numeric > 0) return "SMALL" as const;
  return undefined;
}

function industryFromRaw(raw: unknown) {
  const industries = (raw as { embedded?: { company?: { industries_arr?: unknown } } } | undefined)
    ?.embedded?.company?.industries_arr;
  return Array.isArray(industries)
    ? industries.filter((value) => typeof value === "string").join(", ")
    : undefined;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputs = args.inputs.length > 0 ? args.inputs : await defaultInputFiles(args.outDir);
  if (inputs.length === 0) {
    throw new Error(`No JSONL input files found. Run the crawler first or pass --input <file>.`);
  }

  const previousManifest = await readPreviousManifest(args.outDir);
  const previousPasswordByEmail = new Map(
    previousManifest.map((entry) => [entry.email, entry.password]),
  );
  const jobsByCompany = new Map<string, number>();
  const manifestByEmail = new Map<string, AccountManifestEntry>();
  const records = (await Promise.all(inputs.map(readJsonl))).flat().filter(validRecord);
  const limitedRecords = args.limit ? records.slice(0, args.limit) : records;

  if (args.dryRun) {
    const companies = new Set(
      limitedRecords.map((record) => `${record.sourceSite}:${record.companyName}`),
    );
    for (const record of limitedRecords) {
      mapSalary(record.salary);
      mapWorkType(record.workType || record.location);
      mapJobType(record.jobType);
      mapExperienceLevel(record.experienceLevel || record.title);
      normalizeSkills(record.skills ?? []);
    }
    console.log(
      `Dry run validated ${limitedRecords.length} job(s) across ${companies.size} employer account(s).`,
    );
    return;
  }

  const prisma = createPrismaClient();
  let importedJobs = 0;
  let skippedJobs = 0;

  try {
    for (const record of limitedRecords) {
      const sourceSite = record.sourceSite.toLowerCase();
      const companyName = trimTo(record.companyName.trim(), 180);
      const email = buildEmployerEmail(sourceSite, companyName);
      const previousPassword = previousPasswordByEmail.get(email);
      const password = previousPassword || generatePassword();
      const sourceCompanyUrl = optionalTrim(record.sourceCompanyUrl, 500);
      const companyWebsite = optionalTrim(record.companyWebsite, 1000) ?? null;
      const companyExternalId = stableExternalId(sourceSite, sourceCompanyUrl ?? companyName);
      const companyRawPayload = toOrganizationRawPayload(record);
      const companySize =
        mapCompanySize(record.companySize) ??
        companySizeFromRaw(record.raw) ??
        mapCompanySize(record.companyRaw ? JSON.stringify(record.companyRaw) : undefined);

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        await signUpEmployer(email, password, companyName);
        user = await prisma.user.findUnique({ where: { email } });
      }

      if (!user) {
        throw new Error(`Better Auth did not create user ${email}`);
      }

      if (user.role !== "EMPLOYER" || !user.emailVerified) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: "EMPLOYER", emailVerified: true },
        });
      }

      const organization = await prisma.organization.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          name: companyName,
          description: optionalTrim(record.companyDescription, 5000),
          logoUrl: optionalTrim(record.companyLogoUrl, 1000),
          website: companyWebsite,
          industry:
            optionalTrim(record.companyIndustry, 500) ??
            optionalTrim(record.jobIndustry, 500) ??
            industryFromRaw(record.raw),
          companySize,
          location: optionalTrim(record.companyLocation ?? record.location, 500),
          sourceSite,
          sourceUrl: sourceCompanyUrl,
          externalId: companyExternalId,
          country: optionalTrim(record.companyCountry, 200),
          companyType: optionalTrim(record.companyType, 200),
          workingDays: optionalTrim(record.companyWorkingDays, 200),
          overtimePolicy: optionalTrim(record.companyOvertimePolicy, 200),
          coverImageUrl: optionalTrim(record.companyCoverImageUrl, 1000),
          linkedinUrl: optionalTrim(record.companyLinkedinUrl, 1000),
          jobOpeningsCount: record.companyJobOpeningsCount ?? undefined,
          rawPayload: companyRawPayload,
          verified: true,
          verificationStatus: "VERIFIED",
        },
        update: {
          name: companyName,
          description: optionalTrim(record.companyDescription, 5000),
          logoUrl: optionalTrim(record.companyLogoUrl, 1000),
          website: companyWebsite,
          industry:
            optionalTrim(record.companyIndustry, 500) ??
            optionalTrim(record.jobIndustry, 500) ??
            industryFromRaw(record.raw),
          companySize,
          location: optionalTrim(record.companyLocation ?? record.location, 500),
          sourceSite,
          sourceUrl: sourceCompanyUrl,
          externalId: companyExternalId,
          country: optionalTrim(record.companyCountry, 200),
          companyType: optionalTrim(record.companyType, 200),
          workingDays: optionalTrim(record.companyWorkingDays, 200),
          overtimePolicy: optionalTrim(record.companyOvertimePolicy, 200),
          coverImageUrl: optionalTrim(record.companyCoverImageUrl, 1000),
          linkedinUrl: optionalTrim(record.companyLinkedinUrl, 1000),
          jobOpeningsCount: record.companyJobOpeningsCount ?? undefined,
          rawPayload: companyRawPayload,
          verified: true,
          verificationStatus: "VERIFIED",
        },
      });

      const salary = mapSalary(record.salary);
      const skills = normalizeSkills(record.skills ?? []);
      const externalId = record.externalId || stableExternalId(sourceSite, record.sourceUrl);
      const datePosted = parseDate(record.datePosted);
      const validThrough = parseDate(record.validThrough);
      const crawledAt = record.crawledAt ? new Date(record.crawledAt) : new Date();
      const salaryCurrency =
        optionalTrim(record.salaryCurrency, 20) ?? optionalTrim(record.salary?.currency, 20);
      const salaryUnit =
        optionalTrim(record.salaryUnit, 50) ?? optionalTrim(record.salary?.unit, 50);

      await prisma.job.upsert({
        where: { sourceUrl: record.sourceUrl },
        create: {
          organizationId: organization.id,
          title: trimTo(record.title.trim(), 150),
          description: normalizeDescription(record),
          requirements: record.requirements?.trim() || null,
          benefits: record.benefits?.trim() || null,
          salaryMin: salary.salaryMin,
          salaryMax: salary.salaryMax,
          salaryType: salary.salaryType,
          salaryNegotiable: salary.salaryNegotiable,
          location: trimTo((record.location ?? "Vietnam").trim(), 200),
          workType: mapWorkType(record.workType || record.location),
          jobType: mapJobType(record.jobType),
          experienceLevel: mapExperienceLevel(record.experienceLevel || record.title),
          status: "OPEN",
          publishedAt: datePosted ?? new Date(),
          expiresAt: validThrough,
          industry: optionalTrim(record.jobIndustry, 500),
          salaryCurrency,
          salaryUnit,
          sourcePublishedAt: datePosted,
          experienceMonths: record.experienceMonths ?? undefined,
          streetAddress: optionalTrim(record.streetAddress, 500),
          addressLocality: optionalTrim(record.addressLocality, 200),
          addressRegion: optionalTrim(record.addressRegion, 200),
          addressCountry: optionalTrim(record.addressCountry, 100),
          directApply: record.directApply ?? undefined,
          applicantLocation: optionalTrim(record.applicantLocation, 200),
          sourceSite,
          sourceUrl: record.sourceUrl,
          externalId,
          crawledAt,
          rawPayload: toRawPayload(record),
          skills: { create: skills.map((skill) => ({ skill })) },
        },
        update: {
          organizationId: organization.id,
          title: trimTo(record.title.trim(), 150),
          description: normalizeDescription(record),
          requirements: record.requirements?.trim() || null,
          benefits: record.benefits?.trim() || null,
          salaryMin: salary.salaryMin,
          salaryMax: salary.salaryMax,
          salaryType: salary.salaryType,
          salaryNegotiable: salary.salaryNegotiable,
          location: trimTo((record.location ?? "Vietnam").trim(), 200),
          workType: mapWorkType(record.workType || record.location),
          jobType: mapJobType(record.jobType),
          experienceLevel: mapExperienceLevel(record.experienceLevel || record.title),
          status: "OPEN",
          publishedAt: datePosted ?? undefined,
          expiresAt: validThrough ?? null,
          industry: optionalTrim(record.jobIndustry, 500),
          salaryCurrency,
          salaryUnit,
          sourcePublishedAt: datePosted,
          experienceMonths: record.experienceMonths ?? undefined,
          streetAddress: optionalTrim(record.streetAddress, 500),
          addressLocality: optionalTrim(record.addressLocality, 200),
          addressRegion: optionalTrim(record.addressRegion, 200),
          addressCountry: optionalTrim(record.addressCountry, 100),
          directApply: record.directApply ?? undefined,
          applicantLocation: optionalTrim(record.applicantLocation, 200),
          sourceSite,
          externalId,
          crawledAt,
          rawPayload: toRawPayload(record),
          skills: {
            deleteMany: {},
            create: skills.map((skill) => ({ skill })),
          },
        },
      });

      importedJobs += 1;
      const manifestKey = email;
      jobsByCompany.set(manifestKey, (jobsByCompany.get(manifestKey) ?? 0) + 1);
      manifestByEmail.set(manifestKey, {
        sourceSite,
        companyName,
        email,
        password: user ? password : "",
        userId: user.id,
        organizationId: organization.id,
        sourceCompanyUrl: sourceCompanyUrl ?? "",
        companyLogoUrl: record.companyLogoUrl ?? "",
        companyWebsite: companyWebsite ?? "",
        jobsImported: jobsByCompany.get(manifestKey) ?? 1,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    skippedJobs = limitedRecords.length - importedJobs;
    throw error;
  } finally {
    await prisma.$disconnect();
  }

  const manifest = mergeAccountManifest([...manifestByEmail.values()], previousManifest);
  for (const entry of manifest) {
    entry.jobsImported = jobsByCompany.get(entry.email) ?? entry.jobsImported;
  }

  await mkdir(args.outDir, { recursive: true });
  await writeFile(
    path.join(args.outDir, "employer-accounts.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf-8",
  );

  const csvHeader =
    "sourceSite,companyName,email,password,userId,organizationId,sourceCompanyUrl,companyLogoUrl,companyWebsite,jobsImported,createdAt";
  const csvRows = manifest.map((entry) =>
    [
      entry.sourceSite,
      entry.companyName,
      entry.email,
      entry.password,
      entry.userId,
      entry.organizationId,
      entry.sourceCompanyUrl,
      entry.companyLogoUrl,
      entry.companyWebsite,
      entry.jobsImported,
      entry.createdAt,
    ]
      .map(escapeCsvValue)
      .join(","),
  );
  await writeFile(
    path.join(args.outDir, "employer-accounts.csv"),
    `${[csvHeader, ...csvRows].join("\n")}\n`,
    "utf-8",
  );

  console.log(`Imported ${importedJobs} jobs from ${inputs.length} file(s).`);
  if (skippedJobs > 0) {
    console.log(`Skipped ${skippedJobs} jobs after an error.`);
  }
  console.log(`Wrote employer account manifests to ${args.outDir}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
