import { createFileRoute, Link } from "@tanstack/react-router";
import { useJobs } from "@/routes/__root";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Banknote,
  Building2,
  Clock,
  Briefcase,
  Heart,
  BookmarkCheck,
} from "lucide-react";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { Button } from "@07nghiep/ui/components/button";
import { Badge } from "@07nghiep/ui/components/badge";
import { Separator } from "@07nghiep/ui/components/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@07nghiep/ui/components/card";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@07nghiep/ui/components/avatar";
import ApplyJobModal from "@/components/jobs/ApplyJobModal";
import { ReportSubmitButton } from "@/components/jobs/report-submit-button";
import { trpc } from "@/utils/trpc";

type JobDetailView = {
  id: string;
  title: string;
  companyName: string;
  companyLogo: string;
  location: string;
  workType: string;
  jobType: string;
  experience: string;
  salaryRange: string;
  skills: string[];
  description: string;
  status: string;
};

function mapJob(raw: any): JobDetailView {
  const salaryRange =
    raw.salaryMin && raw.salaryMax
      ? `$${raw.salaryMin.toLocaleString()} - $${raw.salaryMax.toLocaleString()}`
      : "Thỏa thuận";

  const org = raw.organization ?? {};

  return {
    id: raw.id,
    title: raw.title,
    companyName: org.name ?? "Unknown",
    companyLogo: org.logoUrl ?? "",
    location: raw.location ?? "",
    workType: raw.workType ?? "",
    jobType: raw.jobType ?? "",
    experience: raw.experience ?? "",
    salaryRange,
    skills: raw.skills ?? [],
    description: raw.description ?? "",
    status: raw.status,
  };
}

export const Route = createFileRoute("/jobs/$jobId")({
  component: JobDetailPage,
});

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const { jobs, toggleSave } = useJobs();

  const contextJob = jobs.find((j) => j.id === jobId);

  // Always fetch full job detail from API (contextJob from the list doesn't have description)
  const { data: apiJob, isLoading: apiLoading } = useQuery(
    trpc.job.getPublicById.queryOptions({ id: jobId })
  );

  const apiJobView = apiJob ? mapJob(apiJob) : null;

  // Use contextJob as a preview fallback while API is loading
  const contextJobView: JobDetailView | null = contextJob
    ? {
        ...contextJob,
        description: "",
        status: "OPEN",
      }
    : null;

  // Prefer API data (has full description), fall back to context preview
  const job: JobDetailView | null = apiJobView ?? contextJobView;

  const hasAppliedQuery = useQuery(
    trpc.applications.list.queryOptions({ search: undefined })
  );
  const profileQuery = useQuery(trpc.profile.getMyProfile.queryOptions());

  const isLoadingTrigger = hasAppliedQuery.isLoading || profileQuery.isLoading || apiLoading;

  const hasApplied = useMemo(() => {
    if (hasAppliedQuery.data == null) return false;
    return (hasAppliedQuery.data as any[]).some((a) => a.job?.id === jobId);
  }, [hasAppliedQuery.data, jobId]);

  const applicationStatus = useMemo(() => {
    if (hasAppliedQuery.data == null) return null;
    const app = (hasAppliedQuery.data as any[]).find((a) => a.job?.id === jobId);
    return app?.status ?? null;
  }, [hasAppliedQuery.data, jobId]);

  const isProfileComplete = useMemo(() => {
    const p = profileQuery.data as any | undefined;
    if (!p) return false;
    return Boolean(p.summary && p.resumeUrl);
  }, [profileQuery.data]);

  const companyInitials = job
    ? job.companyName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  // Not found state
  if (!job && !apiLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
            <Briefcase className="size-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Không tìm thấy công việc
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Công việc này có thể đã bị xóa hoặc hết hạn.
          </p>
          <Button asChild>
            <Link to="/jobs">
              <ArrowLeft className="size-4" />
              Quay lại danh sách
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (!job) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 md:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Skeleton className="size-14 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-3/5 rounded-md" />
                  <Skeleton className="h-4 w-2/5 rounded-md" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-40 rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isSaved = contextJob?.isSaved ?? false;

  const infoStats = [
    {
      icon: MapPin,
      label: "Địa điểm",
      value: job.location,
      color: "text-primary",
      bgColor: "bg-primary/5",
    },
    {
      icon: Banknote,
      label: "Mức lương",
      value: job.salaryRange,
      color: "text-success",
      bgColor: "bg-success/5",
    },
    {
      icon: Building2,
      label: "Hình thức",
      value: job.workType,
      color: "text-chart-4",
      bgColor: "bg-chart-4/5",
    },
    {
      icon: Clock,
      label: "Loại công việc",
      value: job.jobType,
      color: "text-warning",
      bgColor: "bg-warning/5",
    },
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back link */}
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
          <Link to="/jobs">
            <ArrowLeft className="size-3.5" />
            Quay lại danh sách
          </Link>
        </Button>

        {/* Main card */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              {/* Company info */}
              <div className="flex items-center gap-4">
                <Avatar className="size-14 rounded-xl">
                  {job.companyLogo ? (
                    <AvatarImage
                      src={job.companyLogo}
                      alt={job.companyName}
                      className="rounded-xl"
                    />
                  ) : null}
                  <AvatarFallback className="rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold">
                    {companyInitials}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                    {job.title}
                  </h1>
                  <p className="text-sm text-muted-foreground">{job.companyName}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                <ReportSubmitButton 
                  contentType="JOB" 
                  contentId={jobId!} 
                  variant="ghost"
                  size="sm"
                />
                
                <Button
                  variant={isSaved ? "secondary" : "outline"}
                  onClick={() => toggleSave(job.id)}
                  className="flex-1 md:flex-none gap-1.5"
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="size-4" />
                      Đã lưu
                    </>
                  ) : (
                    <>
                      <Heart className="size-4" />
                      Lưu công việc
                    </>
                  )}
                </Button>

                {isLoadingTrigger ? (
                  <Skeleton className="h-8 w-32 md:w-40 rounded-md" />
                ) : (
                  <ApplyJobModal
                    jobId={jobId!}
                    jobStatus={job.status || "OPEN"}
                    hasApplied={hasApplied}
                    isProfileComplete={isProfileComplete}
                    applicationStatus={applicationStatus}
                  />
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            {/* Info stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {infoStats.map((stat) => (
                <div
                  key={stat.label}
                  className={`flex flex-col gap-2 rounded-lg border border-border/50 p-3.5 ${stat.bgColor}`}
                >
                  <div className="flex items-center gap-2">
                    <stat.icon className={`size-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{stat.value || "—"}</p>
                </div>
              ))}
            </div>

            <Separator />

            {/* Job description */}
            <div className="space-y-4">
              <CardTitle className="text-base font-bold text-foreground">
                Mô tả công việc
              </CardTitle>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>{job.description || "Chưa có mô tả chi tiết."}</p>
              </div>
            </div>

            {/* Skills */}
            {job.skills.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <CardTitle className="text-base font-bold text-foreground">
                    Yêu cầu kỹ năng
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill: string) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="border-primary/20 bg-primary/5 text-primary"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
