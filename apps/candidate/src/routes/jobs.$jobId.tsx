import { createFileRoute, Link } from "@tanstack/react-router";
import { type RouterAppContext, useJobs } from "@/routes/__root";
import { useEffect, useMemo, useState } from "react";
import { createSeoHead, SITE_URL } from "@/lib/seo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import ApplyJobModal from "@/components/jobs/ApplyJobModal";
import { LocationMap } from "@/components/location-map";
import { RichTextBlock } from "@/lib/rich-text";
import { formatSalaryRangeVnd } from "@/lib/salary";
import { useLocalSavedJobs, type LocalSavedJob } from "@/lib/saved-jobs";
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
  CalendarDays,
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
  requirements: string;
  benefits: string;
  experienceLevel: string;
  experienceMonths: number | null;
  industry: string;
  publishedAt: string | null;
  expiresAt: string | null;
  sourceSite: string;
  status: string;
  applicationsCount: number;
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
  salaryNegotiable: boolean | null;
  skills: string[];
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  experienceLevel: string | null;
  experienceMonths: number | null;
  industry: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  sourceSite: string | null;
  status: string;
  applicationsCount: number;
  organization: {
    name: string | null;
    logoUrl: string | null;
  } | null;
};

function mapJob(raw: PublicJobDetail): JobDetailView {
  const salaryRange = formatSalaryRangeVnd(raw.salaryMin, raw.salaryMax, raw.salaryNegotiable);

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
    requirements: raw.requirements ?? "",
    benefits: raw.benefits ?? "",
    experienceLevel: raw.experienceLevel ?? "",
    experienceMonths: raw.experienceMonths ?? null,
    industry: raw.industry ?? "",
    publishedAt: raw.publishedAt ?? null,
    expiresAt: raw.expiresAt ?? null,
    sourceSite: raw.sourceSite ?? "",
    status: raw.status,
    applicationsCount: raw.applicationsCount ?? 0,
  };
}

function formatDate(value: string | null) {
  if (!value) return "Đang cập nhật";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatExperience(level: string, months: number | null) {
  const labels: Record<string, string> = {
    ENTRY: "Mới đi làm",
    JUNIOR: "Junior",
    MIDDLE: "Middle",
    SENIOR: "Senior",
    LEAD: "Lead",
    EXECUTIVE: "Executive",
  };

  const levelLabel = labels[level] ?? level;

  if (!months) return levelLabel || "Đang cập nhật";

  const years = months / 12;
  const yearsLabel = Number.isInteger(years) ? `${years}` : years.toFixed(1).replace(".0", "");

  return `${levelLabel} - ${yearsLabel} năm`;
}

export const Route = createFileRoute("/jobs/$jobId")({
  loader: ({ context, params }) => preloadJobDetailRoute(context, params.jobId),
  head: ({ loaderData, params }) => {
    const job = loaderData as PublicJobDetail | undefined;
    const title = job?.title ? `${job.title} | 07nghiep` : "Chi tiết việc làm | 07nghiep";
    const description = job
      ? `${job.organization?.name ?? "Nhà tuyển dụng"} tuyển ${job.title}${job.location ? ` tại ${job.location}` : ""}. Xem mô tả, yêu cầu và ứng tuyển trực tiếp.`
      : "Xem chi tiết công việc, mô tả, yêu cầu và ứng tuyển trực tiếp.";

    return createSeoHead({
      title,
      description,
      image: job?.organization?.logoUrl || undefined,
      url: `${SITE_URL}/jobs/${params.jobId}`,
    });
  },
  component: JobDetailPage,
});

function preloadJobDetailRoute(context: RouterAppContext, jobId: string) {
  return context.queryClient.ensureQueryData(
    context.trpc.job.getPublicById.queryOptions({ id: jobId }),
  );
}

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const loaderJob = Route.useLoaderData() as PublicJobDetail | null;
  const { jobs } = useJobs();
  const [hasMounted, setHasMounted] = useState(false);
  const { data: session } = authClient.useSession();
  const isLoggedIn = hasMounted && !!session;
  const localSavedJobs = useLocalSavedJobs();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const contextJob = jobs.find((j) => j.id === jobId);

  const { data: apiJob, isLoading: apiLoading } = useQuery(
    trpc.job.getPublicById.queryOptions({ id: jobId }),
  );

  const contextJobView: JobDetailView | null = contextJob
    ? {
        ...contextJob,
        description: "",
        requirements: "",
        benefits: "",
        experienceLevel: contextJob.experience,
        experienceMonths: null,
        industry: "",
        publishedAt: null,
        expiresAt: null,
        sourceSite: "",
        status: "OPEN",
        applicationsCount: 0,
      }
    : null;

  const job: JobDetailView | null =
    (apiJob ? mapJob(apiJob as unknown as PublicJobDetail) : null) ??
    (loaderJob ? mapJob(loaderJob) : null) ??
    contextJobView;
  const localSavedJob = useMemo<LocalSavedJob | null>(() => {
    if (!job) return null;

    return {
      id: job.id,
      title: job.title,
      companyName: job.companyName,
      companyLogo: job.companyLogo,
      isVerified: contextJob?.isVerified ?? false,
      location: job.location,
      workType: job.workType,
      jobType: job.jobType,
      salaryRange: job.salaryRange,
      skills: job.skills,
      postedDate:
        contextJob?.postedDate ?? (job.publishedAt ? formatDate(job.publishedAt) : "Hôm nay"),
      expiresAt: job.expiresAt,
      isSaved: true,
    };
  }, [contextJob?.isVerified, contextJob?.postedDate, job]);

  const hasAppliedQuery = useQuery(
    trpc.applications.list.queryOptions({ search: undefined }, { enabled: isLoggedIn }),
  );
  const profileQuery = useQuery(
    trpc.profile.getMyProfile.queryOptions(undefined, { enabled: isLoggedIn }),
  );
  const savedJobOptions = trpc.savedJob.isSaved.queryOptions({ jobId }, { enabled: isLoggedIn });
  const savedJobQuery = useQuery(savedJobOptions);
  const billingQuery = useQuery(
    trpc.billing.me.queryOptions(undefined, { enabled: isLoggedIn }),
  );
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

  const isSaved = isLoggedIn
    ? (savedJobQuery.data?.saved ?? false)
    : localSavedJobs.savedIds.has(job.id);
  const canSeeApplicantCount = billingQuery.data?.entitlements.candidatePlus ?? false;

  const jobFacts = [
    { label: "Mức lương", value: job.salaryRange, icon: DollarSign },
    { label: "Hình thức", value: job.workType || "Đang cập nhật", icon: BriefcaseBusiness },
    { label: "Loại công việc", value: job.jobType || "Đang cập nhật", icon: Clock3 },
    {
      label: "Kinh nghiệm",
      value: formatExperience(job.experienceLevel, job.experienceMonths),
      icon: Building2,
    },
    { label: "Hạn ứng tuyển", value: formatDate(job.expiresAt), icon: CalendarDays },
    { label: "Ngành nghề", value: job.industry || "Đang cập nhật", icon: BriefcaseBusiness },
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
                    onClick={() => {
                      if (isLoggedIn) {
                        toggleSavedJob.mutate({ jobId: job.id });
                        return;
                      }

                      if (localSavedJob) localSavedJobs.toggleSavedJob(localSavedJob);
                    }}
                    disabled={isLoggedIn && toggleSavedJob.isPending}
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
              <div className="rounded-xl border bg-surface-wash p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-brand-orange">
                    <MapPin className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Địa điểm làm việc
                    </p>
                    <p className="mt-1 max-w-3xl font-semibold leading-6 text-foreground">
                      {job.location || "Linh hoạt"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                <div className="flex flex-col gap-5">
                  <RichTextBlock text={job.description} fallback="Chưa có mô tả chi tiết." />
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

              {job.requirements ? (
                <>
                  <Separator />
                  <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-semibold text-foreground">Yêu cầu ứng viên</h2>
                    <RichTextBlock text={job.requirements} fallback="Chưa có yêu cầu chi tiết." />
                  </div>
                </>
              ) : null}

              {job.benefits ? (
                <>
                  <Separator />
                  <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-semibold text-foreground">Quyền lợi</h2>
                    <RichTextBlock text={job.benefits} fallback="Chưa có quyền lợi chi tiết." />
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="gap-0 border-primary/15 bg-card py-0 shadow-md shadow-primary/5">
              <CardHeader className="border-b bg-surface-wash px-5 py-4">
                <CardTitle className="text-base text-foreground">Ứng tuyển vị trí này</CardTitle>
                <CardDescription>
                  Kiểm tra hồ sơ trước khi gửi để nhà tuyển dụng có đủ thông tin đánh giá.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 px-5 py-4">
                <div className="flex items-start gap-3">
                  {job.companyLogo ? (
                    <img
                      src={job.companyLogo}
                      alt={job.companyName}
                      className="size-12 shrink-0 rounded-xl border object-cover"
                    />
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-muted">
                      <Building2 className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">
                      {job.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{job.companyName}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-muted-foreground">
                  {hasApplied
                    ? `Bạn đã ứng tuyển vị trí này${applicationStatus ? ` (${applicationStatus})` : ""}.`
                    : isLoggedIn
                      ? "Bạn có thể gửi hồ sơ ngay khi CV và tóm tắt cá nhân đã sẵn sàng."
                      : "Bạn có thể lưu việc để quay lại sau; đăng nhập khi sẵn sàng ứng tuyển."}
                </div>
                <div className="rounded-xl border bg-surface-wash p-3 text-sm">
                  <p className="font-medium text-foreground">Số lượng ứng viên</p>
                  <p className="mt-1 text-muted-foreground">
                    {canSeeApplicantCount
                      ? `${job.applicationsCount.toLocaleString("vi-VN")} người đã apply`
                      : "Nâng cấp Plus để xem số lượng ứng viên"}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="bg-card">
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

            <LocationMap address={job.location} title="Bản đồ nơi làm việc" />
          </aside>
        </section>
      </div>
      <JobPostingJsonLd job={job} />
    </div>
  );
}

function JobPostingJsonLd({ job }: { job: JobDetailView }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description || job.title,
    identifier: { "@type": "PropertyValue", name: "07nghiep", value: job.id },
    datePosted: job.publishedAt || new Date().toISOString(),
    validThrough: job.expiresAt || undefined,
    hiringOrganization: {
      "@type": "Organization",
      name: job.companyName,
      logo: job.companyLogo || undefined,
    },
    jobLocation: job.location
      ? {
          "@type": "Place",
          address: { "@type": "PostalAddress", addressLocality: job.location },
        }
      : undefined,
    employmentType: job.jobType || undefined,
    directApply: true,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
