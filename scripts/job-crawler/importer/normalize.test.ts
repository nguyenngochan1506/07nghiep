import { describe, expect, it } from "vitest";

import {
  buildEmployerEmail,
  escapeCsvValue,
  mapExperienceLevel,
  mapJobType,
  mapSalary,
  mapWorkType,
  mergeAccountManifest,
  normalizeSkills,
} from "./normalize";

describe("job crawler importer normalization", () => {
  it("builds deterministic local employer emails", () => {
    expect(buildEmployerEmail("ITviec", "LG CNS Việt Nam")).toBe(
      "crawler+itviec-lg-cns-viet-nam@07nghiep.local",
    );
  });

  it("maps source job enums into local Prisma enums", () => {
    expect(mapJobType("Fulltime")).toBe("FULLTIME");
    expect(mapJobType("Part-time contract")).toBe("PARTIME");
    expect(mapWorkType("Remote from Vietnam")).toBe("REMOTE");
    expect(mapWorkType("Hybrid, Ho Chi Minh")).toBe("HYBRID");
    expect(mapWorkType("Da Nang")).toBe("ONSITE");
    expect(mapExperienceLevel("Fresher, Junior")).toBe("JUNIOR");
    expect(mapExperienceLevel("Lead Engineer")).toBe("LEAD");
  });

  it("normalizes salary data", () => {
    expect(mapSalary({ min: "12000000", max: "15000000", unit: "MONTH" })).toEqual({
      salaryMin: 12000000,
      salaryMax: 15000000,
      salaryType: "MONTHLY",
      salaryNegotiable: false,
    });

    expect(mapSalary({ value: "Negotiable" })).toEqual({
      salaryMin: undefined,
      salaryMax: undefined,
      salaryType: undefined,
      salaryNegotiable: true,
    });
  });

  it("deduplicates and caps skills", () => {
    expect(normalizeSkills([" React ", "react", "NodeJS", "", "TypeScript"])).toEqual([
      "React",
      "NodeJS",
      "TypeScript",
    ]);
  });

  it("reuses existing account passwords from a previous manifest", () => {
    const merged = mergeAccountManifest(
      [
        {
          sourceSite: "itviec",
          companyName: "LG CNS Việt Nam",
          email: "crawler+itviec-lg-cns-viet-nam@07nghiep.local",
          password: "new-password",
          userId: "user-new",
          organizationId: "org-new",
          sourceCompanyUrl: "",
          jobsImported: 3,
          createdAt: "2026-06-26T00:00:00.000Z",
        },
      ],
      [
        {
          sourceSite: "itviec",
          companyName: "LG CNS Việt Nam",
          email: "crawler+itviec-lg-cns-viet-nam@07nghiep.local",
          password: "old-password",
          userId: "user-old",
          organizationId: "org-old",
          sourceCompanyUrl: "",
          jobsImported: 1,
          createdAt: "2026-06-25T00:00:00.000Z",
        },
      ],
    );

    expect(merged[0]?.password).toBe("old-password");
    expect(merged[0]?.userId).toBe("user-new");
  });

  it("escapes CSV values", () => {
    expect(escapeCsvValue('A "quoted", company')).toBe('"A ""quoted"", company"');
  });
});
