import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { AppRouter } from "@07nghiep/server/routers/index";
import type { inferRouterOutputs } from "@trpc/server";
import { MapPin, Users, Globe, Building2, ArrowLeft, ExternalLink, Calendar } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent } from "@07nghiep/ui/components/card";
import { Badge } from "@07nghiep/ui/components/badge";
import { Skeleton } from "@07nghiep/ui/components/skeleton";

const COMPANY_SIZE_LABELS: Record<string, string> = {
  STARTUP: "Startup (1-10)",
  SMALL: "Nhỏ (11-50)",
  MEDIUM: "Vừa (51-200)",
  LARGE: "Lớn (201-1000)",
  ENTERPRISE: "Doanh nghiệp (>1000)",
};

type RouterOutputs = inferRouterOutputs<AppRouter>;
type OrganizationJob = RouterOutputs["organization"]["getJobs"]["jobs"][number];

function formatSalary(raw: OrganizationJob): string {
  if (raw.salaryNegotiable) return "Thỏa thuận";
  const min = raw.salaryMin ? Number(raw.salaryMin).toLocaleString() : null;
  const max = raw.salaryMax ? Number(raw.salaryMax).toLocaleString() : null;
  if (min && max) return `$${min} - $${max}`;
  if (min) return `Từ $${min}`;
  if (max) return `Đến $${max}`;
  return "Thỏa thuận";
}

export const Route = createFileRoute("/organizations/$orgId")({
  component: OrganizationDetailPage,
});

function OrganizationDetailPage() {
  const { orgId } = Route.useParams();

  const { data: org, isLoading: orgLoading } = useQuery(
    trpc.organization.getById.queryOptions({ id: orgId }),
  );

  const { data: jobsData, isLoading: jobsLoading } = useQuery(
    trpc.organization.getJobs.queryOptions({
      organizationId: orgId,
      status: "OPEN",
      page: 1,
      pageSize: 20,
    }),
  );

  const isLoading = orgLoading || jobsLoading;

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background px-4 py-8 text-foreground">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background p-4 text-foreground">
        <Building2 className="mb-4 size-16 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold text-foreground">Không tìm thấy công ty</h1>
        <p className="mb-6 text-muted-foreground">Công ty này không tồn tại hoặc đã bị xóa.</p>
        <Link to="/organizations">
          <Button variant="outline">Quay lại danh sách</Button>
        </Link>
      </div>
    );
  }

  const initials = (org.name ?? "")
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0] ?? "")
    .join("")
    .toUpperCase();

  const jobs = jobsData?.jobs ?? [];

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-8 text-foreground md:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Link
          to="/organizations"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Quay lại danh sách
        </Link>

        {/* Company Info Card */}
        <Card>
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-5">
              {org.logoUrl ? (
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  className="size-20 shrink-0 rounded-xl border object-cover"
                />
              ) : (
                <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <span className="text-2xl font-bold text-primary">{initials}</span>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
                  {org.verified && <Badge variant="secondary">Đã xác thực</Badge>}
                </div>

                {org.industry && <p className="mt-1 text-muted-foreground">{org.industry}</p>}

                <div className="mt-4 flex flex-wrap gap-3">
                  {org.location && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-4" />
                      {org.location}
                    </span>
                  )}
                  {org.companySize && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="size-4" />
                      {COMPANY_SIZE_LABELS[org.companySize] ?? org.companySize}
                    </span>
                  )}
                  {org.website && (
                    <a
                      href={org.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <Globe className="size-4" />
                      Website
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                  {org.foundedYear && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="size-4" />
                      Thành lập {org.foundedYear}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {org.description && (
              <div className="mt-6 border-t pt-6">
                <h3 className="mb-2 font-semibold text-foreground">Giới thiệu</h3>
                <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                  {org.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open Jobs */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            Việc đang tuyển ({jobs.length})
          </h2>

          {jobs.length > 0 ? (
            <div className="space-y-3">
              {jobs.map((job) => (
                <Link key={job.id} to="/jobs/$jobId" params={{ jobId: job.id }}>
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardContent className="flex items-center justify-between p-5">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-foreground">{job.title}</h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {job.location && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="size-3" />
                              {job.location}
                            </span>
                          )}
                          {job.workType && (
                            <Badge variant="secondary" className="text-xs">
                              {job.workType}
                            </Badge>
                          )}
                          {job.jobType && (
                            <Badge variant="outline" className="text-xs">
                              {job.jobType}
                            </Badge>
                          )}
                          {(job.salaryMin || job.salaryMax || job.salaryNegotiable) && (
                            <span className="ml-auto text-sm font-medium text-primary">
                              {formatSalary(job)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <h3 className="mb-2 text-lg font-medium text-foreground">Chưa có việc làm nào</h3>
                <p className="text-muted-foreground">
                  Công ty này hiện chưa đăng tin tuyển dụng nào.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
