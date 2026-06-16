import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  Users,
  Globe,
  Building2,
  ArrowLeft,
  ExternalLink,
  Calendar,
  BadgeCheck,
  Banknote,
  Briefcase,
  Clock,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Button } from "@07nghiep/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@07nghiep/ui/components/card";
import { Badge } from "@07nghiep/ui/components/badge";
import { Separator } from "@07nghiep/ui/components/separator";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@07nghiep/ui/components/avatar";

const COMPANY_SIZE_LABELS: Record<string, string> = {
  STARTUP: "Startup (1-10)",
  SMALL: "Nhỏ (11-50)",
  MEDIUM: "Vừa (51-200)",
  LARGE: "Lớn (201-1000)",
  ENTERPRISE: "Doanh nghiệp (>1000)",
};

function formatSalary(raw: any): string {
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
    trpc.organization.getById.queryOptions({ id: orgId })
  );

  const { data: jobsData, isLoading: jobsLoading } = useQuery(
    trpc.organization.getJobs.queryOptions({
      organizationId: orgId,
      status: "OPEN",
      page: 1,
      pageSize: 20,
    })
  );

  const isLoading = orgLoading || jobsLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 md:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-7 w-40 rounded-md" />
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-4">
                <Skeleton className="size-16 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-2/5 rounded-md" />
                  <Skeleton className="h-4 w-1/4 rounded-md" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-28 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-24 rounded-lg" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-48 rounded-md" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not found state
  if (!org) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
            <Building2 className="size-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Không tìm thấy công ty
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Công ty này không tồn tại hoặc đã bị xóa.
          </p>
          <Button variant="outline" asChild>
            <Link to="/organizations">
              <ArrowLeft className="size-4" />
              Quay lại danh sách
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const initials = (org.name ?? "")
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0] ?? "")
    .join("")
    .toUpperCase();

  const jobs = (jobsData as any)?.jobs ?? [];

  // Company info items
  const infoItems = [
    org.location && {
      icon: MapPin,
      label: org.location,
    },
    org.companySize && {
      icon: Users,
      label: COMPANY_SIZE_LABELS[org.companySize] ?? org.companySize,
    },
    org.foundedYear && {
      icon: Calendar,
      label: `Thành lập ${org.foundedYear}`,
    },
  ].filter(Boolean) as { icon: any; label: string }[];

  return (
    <div className="min-h-screen bg-background py-8 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back link */}
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
          <Link to="/organizations">
            <ArrowLeft className="size-3.5" />
            Quay lại danh sách
          </Link>
        </Button>

        {/* Company Info Card */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-start gap-4">
              <Avatar className="size-16 rounded-xl">
                {org.logoUrl ? (
                  <AvatarImage
                    src={org.logoUrl}
                    alt={org.name}
                    className="rounded-xl"
                  />
                ) : null}
                <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">
                    {org.name}
                  </h1>
                  {org.verified && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-success/30 bg-success/5 text-success"
                    >
                      <BadgeCheck className="size-3" />
                      Đã xác thực
                    </Badge>
                  )}
                </div>

                {org.industry && (
                  <p className="text-sm text-muted-foreground">{org.industry}</p>
                )}

                {/* Info badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {infoItems.map((item) => (
                    <Badge
                      key={item.label}
                      variant="secondary"
                      className="gap-1 font-normal"
                    >
                      <item.icon className="size-3" />
                      {item.label}
                    </Badge>
                  ))}
                  {org.website && (
                    <Badge
                      variant="outline"
                      className="gap-1 font-normal border-primary/20 text-primary hover:bg-primary/5 transition-colors"
                      render={
                        <a
                          href={org.website}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                    >
                      <Globe className="size-3" />
                      Website
                      <ExternalLink className="size-2.5" />
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          {/* Description */}
          {org.description && (
            <CardContent className="space-y-3">
              <CardTitle className="text-base font-bold text-foreground">
                Giới thiệu
              </CardTitle>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {org.description}
              </p>
            </CardContent>
          )}
        </Card>

        {/* Open Jobs */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="size-4 text-primary" />
              <CardTitle className="text-base font-bold text-foreground">
                Việc đang tuyển
              </CardTitle>
              <Badge variant="secondary" className="ml-1">
                {jobs.length}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            {jobs.length > 0 ? (
              <div className="space-y-2">
                {jobs.map((job: any, index: number) => (
                  <div key={job.id}>
                    {index > 0 && <Separator className="my-2" />}
                    <Link
                      to="/jobs/$jobId"
                      params={{ jobId: job.id }}
                      className="group/job-row flex items-center justify-between gap-4 rounded-lg p-3 -mx-1 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <h3 className="text-sm font-semibold text-foreground truncate transition-colors group-hover/job-row:text-primary">
                          {job.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {job.location && (
                            <Badge variant="secondary" className="gap-1 font-normal">
                              <MapPin className="size-3" />
                              {job.location}
                            </Badge>
                          )}
                          {job.workType && (
                            <Badge variant="secondary" className="gap-1 font-normal">
                              <Building2 className="size-3" />
                              {job.workType}
                            </Badge>
                          )}
                          {job.jobType && (
                            <Badge variant="outline" className="gap-1 font-normal">
                              <Clock className="size-3" />
                              {job.jobType}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Salary */}
                      {(job.salaryMin || job.salaryMax || job.salaryNegotiable) && (
                        <Badge
                          variant="outline"
                          className="gap-1 shrink-0 border-success/30 bg-success/5 text-success font-medium"
                        >
                          <Banknote className="size-3" />
                          {formatSalary(job)}
                        </Badge>
                      )}
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted mb-3">
                  <Briefcase className="size-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Chưa có việc làm nào
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Công ty này hiện chưa đăng tin tuyển dụng nào.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
