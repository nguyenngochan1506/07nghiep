import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { AppRouter } from "@07nghiep/server/routers/index";
import type { inferRouterOutputs } from "@trpc/server";
import type React from "react";
import { ArrowRight, Heart, Search } from "lucide-react";
import { JobCardItem } from "@/components/job-card";
import { PageHero } from "@/components/page-hero";
import { formatSalaryRangeVnd } from "@/lib/salary";
import { queryClient, trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardTitle } from "@07nghiep/ui/components/card";
import { Skeleton } from "@07nghiep/ui/components/skeleton";

export const Route = createFileRoute("/saved-jobs")({
  component: SavedJobsPage,
});

type RouterOutputs = inferRouterOutputs<AppRouter>;
type SavedJob = RouterOutputs["savedJob"]["list"]["jobs"][number];
type JobCardItemProps = React.ComponentProps<typeof JobCardItem>;

function mapSavedJob(raw: SavedJob): JobCardItemProps["job"] {
  const salaryRange = formatSalaryRangeVnd(raw.salaryMin, raw.salaryMax);

  const postedAt = new Date(raw.createdAt);
  const diffDays = Math.floor((Date.now() - postedAt.getTime()) / (1000 * 60 * 60 * 24));
  const postedDate =
    diffDays === 0
      ? "Hôm nay"
      : diffDays === 1
        ? "1 ngày trước"
        : diffDays < 30
          ? `${diffDays} ngày trước`
          : `${Math.floor(diffDays / 30)} tháng trước`;

  return {
    id: raw.id,
    companyName: raw.organization?.name ?? "Unknown",
    companyLogo: raw.organization?.logoUrl ?? "",
    isVerified: raw.organization?.verified ?? false,
    title: raw.title,
    location: raw.location ?? "",
    workType: raw.workType ?? "",
    jobType: raw.jobType ?? "",
    salaryRange,
    skills: raw.skills ?? [],
    postedDate,
    expiresAt: raw.expiresAt ?? null,
    isSaved: true,
  };
}

function SavedJobsPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const isLoggedIn = Boolean(session?.user?.id);
  const savedJobsOptions = trpc.savedJob.list.queryOptions(
    { page: 1, pageSize: 20 },
    { enabled: isLoggedIn },
  );
  const savedJobsQuery = useQuery(savedJobsOptions);
  const toggleSavedJob = useMutation(
    trpc.savedJob.toggle.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: savedJobsOptions.queryKey });
      },
    }),
  );
  const savedJobs = (savedJobsQuery.data?.jobs ?? []).map(mapSavedJob);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <PageHero
        image="saved"
        eyebrow={
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-orange/30 bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
            <Heart className="size-4" />
            Danh sách quan tâm
          </p>
        }
        title="Việc làm đã lưu"
        description="Lưu lại những vị trí phù hợp để so sánh, quay lại đọc kỹ và ứng tuyển khi sẵn sàng."
      />

      <main className="container mx-auto max-w-7xl px-4 py-8 md:px-6">
        {sessionPending ? (
          <SavedJobsSkeleton />
        ) : !isLoggedIn ? (
          <SavedJobsEmptyState
            title="Đăng nhập để xem việc đã lưu"
            description="Danh sách việc làm đã lưu được gắn với tài khoản ứng viên của bạn."
            actionLabel="Đăng nhập"
            actionTo="/login"
          />
        ) : savedJobsQuery.isLoading ? (
          <SavedJobsSkeleton />
        ) : savedJobs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {savedJobs.map((job) => (
              <JobCardItem
                key={job.id}
                job={job}
                onSave={(jobId) => toggleSavedJob.mutate({ jobId })}
              />
            ))}
          </div>
        ) : (
          <SavedJobsEmptyState
            title="Chưa có công việc nào được lưu"
            description="Khi thấy một vị trí đáng cân nhắc, nhấn biểu tượng trái tim để giữ lại tại đây."
            actionLabel="Khám phá việc làm"
            actionTo="/jobs"
          />
        )}
      </main>
    </div>
  );
}

function SavedJobsSkeleton() {
  return (
    <Card className="mx-auto w-full max-w-3xl border-dashed">
      <CardContent className="flex flex-col gap-4 px-6 py-12 md:px-12">
        <Skeleton className="mx-auto size-14 rounded-full" />
        <Skeleton className="mx-auto h-6 w-56" />
        <Skeleton className="mx-auto h-4 w-full max-w-md" />
        <Skeleton className="mx-auto h-9 w-36 rounded-md" />
      </CardContent>
    </Card>
  );
}

function SavedJobsEmptyState({
  title,
  description,
  actionLabel,
  actionTo,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionTo: "/jobs" | "/login";
}) {
  return (
    <Card className="mx-auto w-full max-w-3xl border-dashed bg-card/80">
      <CardContent className="flex flex-col items-center gap-6 px-6 py-12 text-center md:px-12 md:py-14">
        <div className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Heart className="size-7" />
        </div>
        <div className="flex max-w-xl flex-col gap-2">
          <CardTitle className="text-xl font-semibold md:text-2xl">{title}</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground md:text-base">{description}</p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button
            asChild
            className="bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90"
          >
            <Link to={actionTo}>
              {actionLabel}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          {actionTo === "/jobs" ? (
            <Button asChild variant="outline">
              <Link to="/jobs">
                <Search data-icon="inline-start" />
                Tìm theo bộ lọc
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
