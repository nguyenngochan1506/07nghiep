import { createFileRoute, Link } from "@tanstack/react-router";
import { useJobs } from "@/routes/__root";
import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import ApplyJobModal from "@/components/jobs/ApplyJobModal";
import { queryClient, trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent } from "@07nghiep/ui/components/card";
import { ArrowLeft, Building2, Heart } from "lucide-react";

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

type PublicJobDetail = {
  id: string;
  title: string;
  location: string | null;
  workType: string | null;
  jobType: string | null;
  experience: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  skills: string[];
  description: string | null;
  status: string;
  organization: {
    name: string | null;
    logoUrl: string | null;
  } | null;
};

function mapJob(raw: PublicJobDetail): JobDetailView {
  const salaryRange =
    raw.salaryMin && raw.salaryMax
      ? `$${raw.salaryMin.toLocaleString()} - $${raw.salaryMax.toLocaleString()}`
      : "Thỏa thuận";

  return {
    id: raw.id,
    title: raw.title,
    companyName: raw.organization?.name ?? "Unknown",
    companyLogo: raw.organization?.logoUrl ?? "",
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
  const { jobs } = useJobs();
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session;

  const contextJob = jobs.find((j) => j.id === jobId);

  const { data: apiJob, isLoading: apiLoading } = useQuery(
    trpc.job.getPublicById.queryOptions({ id: jobId }, { enabled: !contextJob }),
  );

  const contextJobView: JobDetailView | null = contextJob
    ? {
        ...contextJob,
        description: "",
        status: "OPEN",
      }
    : null;

  const job: JobDetailView | null =
    contextJobView ?? (apiJob ? mapJob(apiJob as unknown as PublicJobDetail) : null);

  const hasAppliedQuery = useQuery(
    trpc.applications.list.queryOptions({ search: undefined }, { enabled: isLoggedIn }),
  );
  const profileQuery = useQuery(
    trpc.profile.getMyProfile.queryOptions(undefined, { enabled: isLoggedIn }),
  );
  const savedJobOptions = trpc.savedJob.isSaved.queryOptions({ jobId }, { enabled: isLoggedIn });
  const savedJobQuery = useQuery(savedJobOptions);
  const toggleSavedJob = useMutation(
    trpc.savedJob.toggle.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: savedJobOptions.queryKey });
      },
    }),
  );

  const isLoadingTrigger = hasAppliedQuery.isLoading || profileQuery.isLoading || apiLoading;

  const hasApplied = useMemo(() => {
    if (hasAppliedQuery.data == null) return false;
    const applications = hasAppliedQuery.data as unknown as Array<{ job?: { id: string } | null }>;
    return applications.some((a) => a.job?.id === jobId);
  }, [hasAppliedQuery.data, jobId]);

  const applicationStatus = useMemo(() => {
    if (hasAppliedQuery.data == null) return null;
    const applications = hasAppliedQuery.data as unknown as Array<{
      status: string | null;
      job?: { id: string } | null;
    }>;
    const app = applications.find((a) => a.job?.id === jobId);
    return app?.status ?? null;
  }, [hasAppliedQuery.data, jobId]);

  const isProfileComplete = useMemo(() => {
    const p = profileQuery.data;
    if (!p) return false;
    return Boolean(p.summary && p.resumeUrl);
  }, [profileQuery.data]);

  if (!job && !apiLoading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background p-4 text-foreground">
        <h1 className="mb-4 text-2xl font-bold text-foreground md:text-4xl">
          Không tìm thấy công việc
        </h1>
        <p className="mb-6 text-muted-foreground">Công việc này có thể đã bị xóa hoặc hết hạn.</p>
        <Button asChild>
          <Link to="/jobs">Quay lại danh sách</Link>
        </Button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
        <Skeleton className="h-96 w-full max-w-4xl rounded-xl" />
      </div>
    );
  }

  const isSaved = savedJobQuery.data?.saved ?? false;

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-8 text-foreground md:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Link to="/jobs" className="flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="size-4" />
          Quay lại danh sách
        </Link>

        <Card>
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
              <div className="flex items-center gap-4">
                {job.companyLogo ? (
                  <img
                    src={job.companyLogo}
                    alt={job.companyName}
                    className="size-16 shrink-0 rounded-lg border object-cover"
                  />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border bg-muted">
                    <Building2 className="size-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
                  <p className="mt-1 text-lg text-muted-foreground">{job.companyName}</p>
                </div>
              </div>

              <div className="flex w-full items-center gap-3 md:w-auto">
                <Button
                  type="button"
                  onClick={() => toggleSavedJob.mutate({ jobId: job.id })}
                  disabled={!isLoggedIn || toggleSavedJob.isPending}
                  variant={isSaved ? "default" : "outline"}
                  className="flex-1 md:flex-none"
                >
                  <Heart data-icon="inline-start" />
                  {isSaved ? "Đã lưu" : "Lưu công việc"}
                </Button>

                {isLoadingTrigger ? (
                  <Skeleton className="h-10 w-32 md:w-40 rounded-md" />
                ) : isLoggedIn ? (
                  <ApplyJobModal
                    jobId={job.id}
                    jobStatus={job.status || "OPEN"}
                    hasApplied={hasApplied}
                    isProfileComplete={isProfileComplete}
                    applicationStatus={applicationStatus}
                  />
                ) : (
                  <Button asChild>
                    <Link to="/login">Đăng nhập để ứng tuyển</Link>
                  </Button>
                )}
              </div>
            </div>

            <hr className="my-8 border-border" />

            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-secondary p-4">
                <p className="mb-1 text-sm text-muted-foreground">Địa điểm</p>
                <p className="font-semibold text-foreground">{job.location}</p>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <p className="mb-1 text-sm text-muted-foreground">Mức lương</p>
                <p className="font-semibold text-foreground">{job.salaryRange}</p>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <p className="mb-1 text-sm text-muted-foreground">Hình thức</p>
                <p className="font-semibold text-foreground">{job.workType}</p>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <p className="mb-1 text-sm text-muted-foreground">Loại công việc</p>
                <p className="font-semibold text-foreground">{job.jobType}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-foreground">Mô tả công việc</h2>
              <div className="flex flex-col gap-2 leading-relaxed text-muted-foreground">
                <p>{job.description || "Chưa có mô tả chi tiết."}</p>
                {job.skills.length > 0 && (
                  <>
                    <p className="mt-4 font-semibold text-foreground">Yêu cầu kỹ năng:</p>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skill: string) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
