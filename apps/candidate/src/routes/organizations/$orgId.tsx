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
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <Building2 className="h-16 w-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Không tìm thấy công ty</h1>
        <p className="text-gray-500 mb-6">Công ty này không tồn tại hoặc đã bị xóa.</p>
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          to="/organizations"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
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
                  className="w-20 h-20 rounded-xl object-cover border border-gray-200 shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-2xl font-bold text-primary">{initials}</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
                  {org.verified && (
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-700 border-green-200"
                    >
                      Đã xác thực
                    </Badge>
                  )}
                </div>

                {org.industry && <p className="text-muted-foreground mt-1">{org.industry}</p>}

                <div className="flex flex-wrap gap-3 mt-4">
                  {org.location && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {org.location}
                    </span>
                  )}
                  {org.companySize && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
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
                      <Globe className="h-4 w-4" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {org.foundedYear && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Thành lập {org.foundedYear}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {org.description && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">Giới thiệu</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {org.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open Jobs */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Việc đang tuyển ({jobs.length})
          </h2>

          {jobs.length > 0 ? (
            <div className="space-y-3">
              {jobs.map((job) => (
                <Link key={job.id} to="/jobs/$jobId" params={{ jobId: job.id }}>
                  <Card className="transition-shadow hover:shadow-md cursor-pointer">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {job.location && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
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
                            <span className="text-sm font-medium text-primary ml-auto">
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
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
              <h3 className="text-lg font-medium text-gray-600 mb-2">Chưa có việc làm nào</h3>
              <p className="text-gray-500">Công ty này hiện chưa đăng tin tuyển dụng nào.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
