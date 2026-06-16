import { Badge } from "@07nghiep/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@07nghiep/ui/components/avatar";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import {
  ArrowDownToLine,
  Briefcase,
  GraduationCap,
  Github,
  Globe,
  Linkedin,
  MapPin,
  Phone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Link, createFileRoute } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

type ProfileApiData = {
  userId?: string | null;
  avatarUrl?: string | null;
  resumeUrl?: string | null;
  headline?: string | null;
  summary?: string | null;
  phone?: string | null;
  location?: string | null;
  skills?: string[] | null;
  portfolioUrl?: string | null;
  experience?: unknown;
  education?: unknown;
};

type ExperienceItem = {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
};

type EducationItem = {
  degree: string;
  school: string;
  location: string;
  startDate: string;
  endDate: string;
  gpa?: string;
};

type PortfolioLinks = {
  linkedin: string;
  github: string;
  website: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapExperience(value: unknown): ExperienceItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      title: asString(item.title),
      company: asString(item.company),
      location: asString(item.location),
      startDate: asString(item.startDate),
      endDate: asString(item.endDate),
      description: asString(item.description),
    }))
    .filter(
      (item) =>
        item.title ||
        item.company ||
        item.location ||
        item.startDate ||
        item.endDate ||
        item.description,
    );
}

function mapEducation(value: unknown): EducationItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      degree: asString(item.degree),
      school: asString(item.school),
      location: asString(item.location),
      startDate: typeof item.startYear === "number" ? String(item.startYear) : "",
      endDate: typeof item.endYear === "number" ? String(item.endYear) : "",
      gpa: asString(item.gpa),
    }))
    .filter(
      (item) => item.degree || item.school || item.location || item.startDate || item.endDate,
    );
}

function inferPortfolioLinks(portfolioUrl?: string | null): PortfolioLinks {
  if (!portfolioUrl) {
    return {
      linkedin: "",
      github: "",
      website: "",
    };
  }

  const normalized = portfolioUrl.toLowerCase();
  return {
    linkedin: normalized.includes("linkedin.com") ? portfolioUrl : "",
    github: normalized.includes("github.com") ? portfolioUrl : "",
    website:
      !normalized.includes("linkedin.com") && !normalized.includes("github.com")
        ? portfolioUrl
        : "",
  };
}

export const Route = createFileRoute("/profile/")({
  loader: async ({ context }) => {
    return context.queryClient.ensureQueryData(context.trpc.profile.getMyProfile.queryOptions());
  },
  component: ProfilePage,
});

function ProfilePage() {
  const profile = Route.useLoaderData() as ProfileApiData;
  const { data: session } = authClient.useSession();
  const sessionUserId = typeof session?.user?.id === "string" ? session.user.id : "";
  const sessionRole =
    typeof (session?.user as { role?: unknown } | undefined)?.role === "string"
      ? (session?.user as { role?: string }).role
      : undefined;
  const canEditProfile =
    Boolean(sessionRole) && Boolean(sessionUserId) && sessionUserId === (profile.userId ?? "");

  const fullName = session?.user.name ?? "Chưa cập nhật họ tên";
  const email = session?.user.email ?? "Chưa cập nhật email";
  const avatarUrl = profile.avatarUrl || session?.user.image || "";
  const portfolio = inferPortfolioLinks(profile.portfolioUrl);
  const experience = mapExperience(profile.experience);
  const education = mapEducation(profile.education);

  const initials =
    fullName
      .split(" ")
      .slice(0, 2)
      .map((word) => word[0] ?? "")
      .join("") || "NA";

  const hasSkills = (profile.skills?.length ?? 0) > 0;
  const hasResume = Boolean(profile.resumeUrl);
  const hasPortfolioLinks = Boolean(portfolio.linkedin || portfolio.github || portfolio.website);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 text-foreground">
      <div className="flex flex-col gap-10 font-sans">
        <Card className="overflow-hidden rounded-xl border-border/60 bg-card shadow-sm">
          <CardContent className="flex flex-col gap-8 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <Avatar className="size-28 rounded-full ring-2 ring-border md:size-32">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="text-2xl font-semibold">{initials}</AvatarFallback>
              </Avatar>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                    {fullName}
                  </h1>
                  <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                    {profile.headline || "Chưa cập nhật headline"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5">
                    <Phone className="size-4" />
                    {profile.phone || "Chưa cập nhật số điện thoại"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5">
                    <Globe className="size-4" />
                    {email}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5">
                    <MapPin className="size-4" />
                    {profile.location || "Chưa cập nhật địa điểm"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {canEditProfile ? (
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/profile/edit">Chỉnh sửa Hồ sơ</Link>
                </Button>
              ) : null}
              {portfolio.linkedin ? (
                <Button asChild variant="outline" className="rounded-full">
                  <a href={portfolio.linkedin} target="_blank" rel="noreferrer">
                    <Linkedin data-icon="inline-start" />
                    LinkedIn
                  </a>
                </Button>
              ) : null}
              {portfolio.github ? (
                <Button asChild variant="outline" className="rounded-full">
                  <a href={portfolio.github} target="_blank" rel="noreferrer">
                    <Github data-icon="inline-start" />
                    GitHub
                  </a>
                </Button>
              ) : null}
              {portfolio.website ? (
                <Button asChild variant="outline" className="rounded-full">
                  <a href={portfolio.website} target="_blank" rel="noreferrer">
                    <Globe data-icon="inline-start" />
                    Website
                  </a>
                </Button>
              ) : null}
              {hasResume ? (
                <Button
                  asChild
                  className="rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <a href={profile.resumeUrl || "#"} download>
                    <ArrowDownToLine data-icon="inline-start" />
                    Download CV
                  </a>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm leading-7 text-muted-foreground">
              <p>{profile.summary || "Thông tin chưa được cập nhật"}</p>
              <div className="pt-2">
                {hasSkills ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills?.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-primary"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                    Thông tin chưa được cập nhật
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Portfolio</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {hasPortfolioLinks ? (
                <>
                  {portfolio.linkedin ? (
                    <Button asChild variant="outline" className="w-full justify-start rounded-xl">
                      <a
                        href={portfolio.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full"
                      >
                        <Linkedin data-icon="inline-start" />
                        LinkedIn
                      </a>
                    </Button>
                  ) : null}
                  {portfolio.github ? (
                    <Button asChild variant="outline" className="w-full justify-start rounded-xl">
                      <a
                        href={portfolio.github}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full"
                      >
                        <Github data-icon="inline-start" />
                        GitHub
                      </a>
                    </Button>
                  ) : null}
                  {portfolio.website ? (
                    <Button asChild variant="outline" className="w-full justify-start rounded-xl">
                      <a
                        href={portfolio.website}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full"
                      >
                        <Globe data-icon="inline-start" />
                        Website
                      </a>
                    </Button>
                  ) : null}
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                  Thông tin chưa được cập nhật
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          <TimelineCard
            title="Experience"
            icon={Briefcase}
            items={experience}
            emptyMessage="Chưa có kinh nghiệm làm việc."
          />
          <TimelineCard
            title="Education"
            icon={GraduationCap}
            items={education}
            emptyMessage="Chưa có thông tin học vấn."
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function TimelineCard({
  title,
  icon: Icon,
  items,
  emptyMessage,
}: {
  title: string;
  icon: LucideIcon;
  items: Array<Record<string, string>>;
  emptyMessage: string;
}) {
  const hasItems = items.length > 0;

  return (
    <Card className="rounded-xl border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasItems ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-2 top-1 h-full w-px bg-border" />
            <div className="flex flex-col gap-6">
              {items.map((item, index) => {
                const isExperience = "company" in item;

                return (
                  <div key={`${title}-${index}`} className="relative">
                    <span className="absolute -left-[1.15rem] top-1.5 size-3 rounded-full border-2 border-background bg-primary" />
                    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-secondary/20 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {isExperience ? item.title : item.degree}
                          </h3>
                          <div className="text-sm text-muted-foreground">
                            {isExperience ? item.company : item.school}
                            {!isExperience && item.gpa && (
                              <p className="mt-1 text-xs font-medium text-primary">
                                GPA: {item.gpa}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>
                            {item.startDate || "?"} - {item.endDate || "Hiện tại"}
                          </p>
                          <p>{item.location || ""}</p>
                        </div>
                      </div>
                      {isExperience ? (
                        <p className="text-sm leading-6 text-muted-foreground">
                          {item.description || "Chưa có mô tả."}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
