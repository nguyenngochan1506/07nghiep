import { createHash, randomBytes } from "node:crypto";

export type JobType = "FULLTIME" | "PARTIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
export type WorkType = "REMOTE" | "HYBRID" | "ONSITE";
export type ExperienceLevel = "ENTRY" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD" | "EXECUTIVE";
export type SalaryType = "HOURLY" | "MONTHLY" | "YEARLY";

export type SourceSalary = {
  min?: string | number | null;
  max?: string | number | null;
  unit?: string | null;
  currency?: string | null;
  value?: string | null;
  isNegotiable?: boolean | string | number | null;
};

export type AccountManifestEntry = {
  sourceSite: string;
  companyName: string;
  email: string;
  password: string;
  userId: string;
  organizationId: string;
  sourceCompanyUrl: string;
  companyLogoUrl?: string;
  companyWebsite?: string;
  jobsImported: number;
  createdAt: string;
};

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function slugify(value: string) {
  const slug = stripDiacritics(value)
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return slug || "unknown";
}

export function buildEmployerEmail(sourceSite: string, companyName: string) {
  return `crawler+${slugify(sourceSite)}-${slugify(companyName)}@07nghiep.local`;
}

export function generatePassword() {
  return `JobCrawler-${randomBytes(18).toString("base64url")}`;
}

export function stableExternalId(sourceSite: string, sourceUrl: string) {
  return createHash("sha256").update(`${sourceSite}:${sourceUrl}`).digest("hex").slice(0, 24);
}

function lower(value?: string | null) {
  return (value ?? "").toLowerCase();
}

export function mapJobType(value?: string | null): JobType {
  const text = lower(value);
  if (text.includes("intern") || text.includes("thuc tap") || text.includes("thực tập")) {
    return "INTERNSHIP";
  }
  if (text.includes("part") || text.includes("ban thoi gian") || text.includes("bán thời gian")) {
    return "PARTIME";
  }
  if (text.includes("freelance")) {
    return "FREELANCE";
  }
  if (text.includes("contract")) {
    return "CONTRACT";
  }
  return "FULLTIME";
}

export function mapWorkType(value?: string | null): WorkType {
  const text = lower(value);
  if (text.includes("remote") || text.includes("từ xa") || text.includes("tu xa")) {
    return "REMOTE";
  }
  if (text.includes("hybrid")) {
    return "HYBRID";
  }
  return "ONSITE";
}

export function mapExperienceLevel(value?: string | null): ExperienceLevel {
  const text = lower(value);
  if (text.includes("executive") || text.includes("director") || text.includes("head of")) {
    return "EXECUTIVE";
  }
  if (text.includes("lead") || text.includes("leader") || text.includes("trưởng nhóm")) {
    return "LEAD";
  }
  if (text.includes("senior") || text.includes("5 years") || text.includes("5 năm")) {
    return "SENIOR";
  }
  if (
    text.includes("middle") ||
    text.includes("mid") ||
    text.includes("2 years") ||
    text.includes("3 years")
  ) {
    return "MIDDLE";
  }
  if (text.includes("junior") || text.includes("fresher") || text.includes("1 year")) {
    return "JUNIOR";
  }
  return "ENTRY";
}

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function mapCompanySize(value?: string | null) {
  const text = lower(value);
  const numbers = [...text.matchAll(/\d[\d.,]*/g)]
    .map((match) => Number(match[0].replace(/[^\d]/g, "")))
    .filter((number) => Number.isFinite(number));
  const largest = numbers.length > 0 ? Math.max(...numbers) : 0;

  if (text.includes("enterprise") || largest >= 1000) return "ENTERPRISE" as const;
  if (text.includes("large") || largest >= 250) return "LARGE" as const;
  if (text.includes("medium") || largest >= 50) return "MEDIUM" as const;
  if (text.includes("startup")) return "STARTUP" as const;
  if (text || largest > 0) return "SMALL" as const;
  return undefined;
}

export function mapSalary(source?: SourceSalary | null): {
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: SalaryType;
  salaryNegotiable: boolean;
} {
  if (!source) {
    return { salaryNegotiable: true };
  }

  const valueText = lower(source.value);
  const explicitNegotiable =
    source.isNegotiable === true ||
    source.isNegotiable === "1" ||
    source.isNegotiable === 1 ||
    valueText.includes("negotiable") ||
    valueText.includes("thỏa thuận") ||
    valueText.includes("thoả thuận");

  const salaryMin = toNumber(source.min);
  const salaryMax = toNumber(source.max);
  const unit = lower(source.unit);
  const salaryType = unit.includes("year")
    ? "YEARLY"
    : unit.includes("hour")
      ? "HOURLY"
      : salaryMin || salaryMax
        ? "MONTHLY"
        : undefined;

  return {
    salaryMin,
    salaryMax,
    salaryType,
    salaryNegotiable: explicitNegotiable || (!salaryMin && !salaryMax),
  };
}

export function normalizeSkills(skills: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const skill of skills) {
    const normalized = (skill ?? "").trim().replace(/\s+/g, " ");
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
    if (result.length === 20) {
      break;
    }
  }

  return result;
}

export function escapeCsvValue(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (!/[",\n\r]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export function mergeAccountManifest(
  current: AccountManifestEntry[],
  previous: AccountManifestEntry[],
) {
  const previousByEmail = new Map(previous.map((entry) => [entry.email, entry]));

  return current.map((entry) => {
    const previousEntry = previousByEmail.get(entry.email);
    if (!previousEntry?.password) {
      return entry;
    }

    return {
      ...entry,
      password: previousEntry.password,
    };
  });
}
