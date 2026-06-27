import { createFileRoute, Link } from "@tanstack/react-router";
import { useJobs } from "@/routes/__root";
import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import ApplyJobModal from "@/components/jobs/ApplyJobModal";
import { formatSalaryRangeVnd } from "@/lib/salary";
import { queryClient, trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@07nghiep/ui/components/card";
import { Separator } from "@07nghiep/ui/components/separator";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Clock3,
  DollarSign,
  Heart,
  MapPin,
} from "lucide-react";

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
  const salaryRange = formatSalaryRangeVnd(raw.salaryMin, raw.salaryMax);

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

  const jobFacts = [
    { label: "Địa điểm", value: job.location || "Linh hoạt", icon: MapPin },
    { label: "Mức lương", value: job.salaryRange, icon: DollarSign },
    { label: "Hình thức", value: job.workType || "Đang cập nhật", icon: BriefcaseBusiness },
    { label: "Loại công việc", value: job.jobType || "Đang cập nhật", icon: Clock3 },
  ];

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-8 text-foreground md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Link
          to="/jobs"
          className="flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Quay lại danh sách
        </Link>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="shadow-md shadow-primary/5">
            <CardHeader className="gap-5 p-6 md:p-8">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                <div className="flex items-start gap-4">
                  {job.companyLogo ? (
                    <img
                      src={job.companyLogo}
                      alt={job.companyName}
                      className="size-16 shrink-0 rounded-xl border object-cover"
                    />
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border bg-muted">
                      <Building2 className="size-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <Badge className="mb-3 bg-accent text-accent-foreground">
                      {job.status || "OPEN"}
                    </Badge>
                    <CardTitle className="text-2xl font-semibold tracking-tight md:text-3xl">
                      {job.title}
                    </CardTitle>
                    <CardDescription className="mt-2 text-base">{job.companyName}</CardDescription>
                  </div>
                </div>

                <div className="flex w-full items-center gap-3 md:w-auto">
                  <Button
                    type="button"
                    onClick={() => toggleSavedJob.mutate({ jobId: job.id })}
                    disabled={!isLoggedIn || toggleSavedJob.isPending}
                    variant={isSaved ? "default" : "outline"}
                    className={
                      isSaved
                        ? "flex-1 bg-primary text-primary-foreground md:flex-none"
                        : "flex-1 md:flex-none"
                    }
                  >
                    <Heart data-icon="inline-start" />
                    {isSaved ? "Đã lưu" : "Lưu"}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-8 px-6 pb-8 md:px-8">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {jobFacts.map((fact) => (
                  <div key={fact.label} className="rounded-xl border bg-surface-wash p-4">
                    <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-card text-brand-orange">
                      <fact.icon className="size-4" />
                    </div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      {fact.label}
                    </p>
                    <p className="mt-1 font-semibold text-foreground">{fact.value}</p>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex flex-col gap-4">
                <h2 className="text-xl font-semibold text-foreground">Mô tả công việc</h2>
                <div className="flex flex-col gap-4 leading-7 text-muted-foreground">
                  <p>{job.description || "Chưa có mô tả chi tiết."}</p>
                  {job.skills.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <p className="font-semibold text-foreground">Yêu cầu kỹ năng</p>
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map((skill: string) => (
                          <Badge key={skill} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="border-primary/15 bg-primary text-primary-foreground shadow-md shadow-primary/10">
              <CardHeader>
                <CardTitle className="text-base">Ứng tuyển vị trí này</CardTitle>
                <CardDescription className="text-primary-foreground/75">
                  Kiểm tra hồ sơ trước khi gửi để nhà tuyển dụng có đủ thông tin đánh giá.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {job.companyLogo ? (
                  <img
                    src={job.companyLogo}
                    alt={job.companyName}
                    className="size-12 shrink-0 rounded-xl border border-primary-foreground/20 object-cover"
                  />
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary-foreground/20 bg-primary-foreground/10">
                    <Building2 className="size-5 text-primary-foreground/75" />
                  </div>
                )}
                <div className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 p-3 text-sm text-primary-foreground/80">
                  {hasApplied
                    ? `Bạn đã ứng tuyển vị trí này${applicationStatus ? ` (${applicationStatus})` : ""}.`
                    : isLoggedIn
                      ? "Bạn có thể gửi hồ sơ ngay khi CV và tóm tắt cá nhân đã sẵn sàng."
                      : "Đăng nhập để lưu việc và gửi hồ sơ ứng tuyển."}
                </div>
              </CardContent>
              <CardFooter>
                {isLoadingTrigger ? (
                  <Skeleton className="h-10 w-full rounded-md" />
                ) : isLoggedIn ? (
                  <ApplyJobModal
                    jobId={job.id}
                    jobStatus={job.status || "OPEN"}
                    hasApplied={hasApplied}
                    isProfileComplete={isProfileComplete}
                    applicationStatus={applicationStatus}
                  />
                ) : (
                  <Button
                    asChild
                    className="w-full bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90"
                  >
                    <Link to="/login">Đăng nhập để ứng tuyển</Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          </aside>
        </section>
      </div>
    </div>
  );
}
