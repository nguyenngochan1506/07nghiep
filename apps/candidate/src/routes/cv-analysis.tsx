import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@07nghiep/ui/components/card";
import { Progress } from "@07nghiep/ui/components/progress";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CreditCard,
  FileSearch,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/cv-analysis")({
  component: CvAnalysisPage,
});

type LatestAnalysis = {
  status: string;
  overallScore: number | null;
  summary: string | null;
  strengths: unknown;
  weaknesses: unknown;
  suggestions: unknown;
  extractedSkills: string[];
  errorMessage: string | null;
};

type RecommendedJob = {
  match: {
    jobId: string;
    matchScore: number;
    reasons: string[];
  };
  job: {
    id: string;
    title: string;
    organization?: { name: string | null } | null;
  } | null;
};

type RecommendedJobs = RecommendedJob[];

const statusLabels: Record<string, string> = {
  PENDING: "Đang chờ",
  PROCESSING: "Đang phân tích",
  COMPLETED: "Hoàn tất",
  FAILED: "Thất bại",
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function getStatusVariant(status?: string | null) {
  if (status === "COMPLETED") return "default";
  if (status === "FAILED") return "destructive";
  return "secondary";
}

function CvAnalysisPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const isLoggedIn = Boolean(session?.user?.id);
  const profileQuery = useQuery(
    trpc.profile.getMyProfile.queryOptions(undefined, { enabled: isLoggedIn }),
  );
  const billingQuery = useQuery(
    trpc.billing.me.queryOptions(undefined, {
      enabled: isLoggedIn,
    }),
  );
  const latestQuery = useQuery(
    trpc.cvAnalysis.myLatest.queryOptions(undefined, {
      enabled: isLoggedIn,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "PENDING" || status === "PROCESSING" ? 4000 : false;
      },
    }),
  );
  const recommendedJobsQuery = useQuery(
    trpc.cvAnalysis.getRecommendedJobs.queryOptions(undefined, {
      enabled: isLoggedIn && latestQuery.data?.status === "COMPLETED",
    }),
  );
  const createAnalysisMutation = useMutation({
    mutationFn: () => trpcClient.cvAnalysis.createFromCurrentResume.mutate(),
    onSuccess: async () => {
      toast.success("Đã gửi CV vào hàng đợi phân tích");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.cvAnalysis.myLatest.queryKey() }),
        queryClient.invalidateQueries({ queryKey: trpc.cvAnalysis.getRecommendedJobs.queryKey() }),
        queryClient.invalidateQueries({ queryKey: trpc.billing.me.queryKey() }),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });
  const extraCreditsCheckoutMutation = useMutation({
    mutationFn: () => trpcClient.billing.createCandidateAiCvCreditsCheckout.mutate(),
    onSuccess: (payment) => {
      window.location.href = payment.checkoutUrl;
    },
    onError: (error) => toast.error(error.message),
  });

  if (sessionPending) {
    return (
      <main className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto grid max-w-6xl gap-5">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Đăng nhập để phân tích CV</CardTitle>
            <CardDescription>
              Tính năng này sử dụng CV trong hồ sơ ứng viên của tài khoản hiện tại.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/login" search={{ redirect: "/cv-analysis" }}>
                Đăng nhập
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const profile = profileQuery.data as { resumeUrl?: string | null } | undefined;
  const latest = latestQuery.data as LatestAnalysis | null | undefined;
  const entitlements = billingQuery.data?.entitlements;
  const isPlus = entitlements?.candidatePlus ?? false;
  const remaining = entitlements?.aiCvRemaining ?? 0;
  const hasResume = Boolean(profile?.resumeUrl);
  const status = latest?.status ?? null;
  const isAnalysisRunning = status === "PENDING" || status === "PROCESSING";
  const isAnalyzeButtonLoading = createAnalysisMutation.isPending || isAnalysisRunning;
  const quotaExhausted = isPlus && remaining <= 0;
  const canAnalyze =
    isPlus && remaining > 0 && hasResume && !createAnalysisMutation.isPending && !isAnalysisRunning;
  const strengths = asStringArray(latest?.strengths);
  const weaknesses = asStringArray(latest?.weaknesses);
  const suggestions = asStringArray(latest?.suggestions);
  const recommendedJobs = (recommendedJobsQuery.data?.jobs ?? []) as RecommendedJobs;

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-surface-wash/70 px-4 py-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <Badge className="mb-4" variant={isPlus ? "default" : "secondary"}>
              Candidate Plus
            </Badge>
            <h1 className="text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
              Phân tích CV bằng AI
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Chấm điểm CV, nhận gợi ý chỉnh sửa và xem các việc đang mở phù hợp với hồ sơ hiện tại.
            </p>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quyền sử dụng</CardTitle>
              <CardDescription>
                {isAnalysisRunning
                  ? "AI đang phân tích CV hiện tại. Vui lòng chờ kết quả trước khi gửi lượt mới."
                  : quotaExhausted
                    ? "Bạn đã dùng hết lượt AI CV trong kỳ hiện tại."
                  : isPlus
                    ? `${remaining} lượt còn lại trong kỳ hiện tại`
                    : "Cần Candidate Plus"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button
                disabled={!canAnalyze}
                onClick={() => createAnalysisMutation.mutate()}
                className="w-full"
              >
                {isAnalyzeButtonLoading ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Sparkles data-icon="inline-start" />
                )}
                {isAnalysisRunning ? "AI đang phân tích" : "Phân tích CV hiện tại"}
              </Button>
              {!isPlus ? (
                <Button asChild variant="outline" className="w-full">
                  <Link to="/billing">Nâng cấp Plus</Link>
                </Button>
              ) : quotaExhausted ? (
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={extraCreditsCheckoutMutation.isPending}
                  onClick={() => extraCreditsCheckoutMutation.mutate()}
                >
                  {extraCreditsCheckoutMutation.isPending ? (
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <CreditCard data-icon="inline-start" />
                  )}
                  Mua thêm lượt
                </Button>
              ) : !hasResume ? (
                <Button asChild variant="outline" className="w-full">
                  <Link to="/profile/edit">Cập nhật CV</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6">
        <AnalysisOverview latest={latest} loading={latestQuery.isLoading} status={status} />
        <div className="flex flex-col gap-5">
          <InsightGrid strengths={strengths} weaknesses={weaknesses} suggestions={suggestions} />
          <SkillsCard skills={latest?.extractedSkills ?? []} />
          <RecommendedJobsCard jobs={recommendedJobs} loading={recommendedJobsQuery.isLoading} />
        </div>
      </section>
    </main>
  );
}

function AnalysisOverview({
  latest,
  loading,
  status,
}: {
  latest?: LatestAnalysis | null;
  loading: boolean;
  status?: string | null;
}) {
  if (loading) {
    return <Skeleton className="h-56 rounded-xl" />;
  }

  const score = latest?.overallScore ?? 0;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSearch className="size-4 text-primary" />
              Tổng quan phân tích
            </CardTitle>
            <CardDescription className="mt-1">
              CV hiện tại được chấm theo mức độ sẵn sàng ứng tuyển và chất lượng trình bày.
            </CardDescription>
          </div>
          <Badge variant={getStatusVariant(status)}>
            {statusLabels[status ?? ""] ?? "Chưa có"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-[220px_1fr]">
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="flex items-end gap-2">
            <span className="text-5xl font-semibold leading-none tabular-nums">{score}</span>
            <span className="pb-2 text-sm text-muted-foreground">/ 100</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Điểm CV</p>
          <Progress value={score} className="mt-4" />
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium">Nhận định</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {latest?.summary ?? "Chưa có bản phân tích nào."}
            </p>
          </div>
          {latest?.errorMessage ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {latest.errorMessage}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function InsightGrid({
  strengths,
  weaknesses,
  suggestions,
}: {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-base">Chi tiết phân tích CV</CardTitle>
        <CardDescription>Đọc theo thứ tự từ điểm mạnh đến các thay đổi nên làm.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y p-0">
        <InsightCard title="Điểm mạnh" items={strengths} empty="Chưa có dữ liệu" />
        <InsightCard title="Cần cải thiện" items={weaknesses} empty="Chưa có dữ liệu" />
        <InsightCard title="Gợi ý chỉnh CV" items={suggestions} empty="Chưa có dữ liệu" />
      </CardContent>
    </Card>
  );
}

function InsightCard({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
      </div>
      {items.length > 0 ? (
        <ul className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function SkillsCard({ skills }: { skills: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kỹ năng AI đọc được từ CV</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {skills.length > 0 ? (
          skills.slice(0, 30).map((skill) => (
            <Badge key={skill} variant="secondary">
              {skill}
            </Badge>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu kỹ năng.</p>
        )}
      </CardContent>
    </Card>
  );
}

function RecommendedJobsCard({ jobs, loading }: { jobs: RecommendedJobs; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BriefcaseBusiness className="size-4 text-primary" />
          Việc làm phù hợp
        </CardTitle>
        <CardDescription>Danh sách được xếp theo điểm phù hợp với CV mới nhất.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loading ? (
          <>
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </>
        ) : jobs.length > 0 ? (
          jobs.map((item) => <RecommendedJobRow key={item.match.jobId} item={item} />)
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có việc phù hợp từ bản phân tích.</p>
        )}
      </CardContent>
    </Card>
  );
}

function RecommendedJobRow({ item }: { item: RecommendedJob }) {
  if (!item.job) return null;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium">{item.job.title}</p>
          <p className="text-sm text-muted-foreground">{item.job.organization?.name}</p>
        </div>
        <Badge>{item.match.matchScore}% phù hợp</Badge>
      </div>
      <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
        {item.match.reasons.slice(0, 2).map((reason) => (
          <span key={reason}>{reason}</span>
        ))}
      </div>
      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link to="/jobs/$jobId" params={{ jobId: item.job.id }}>
          Xem việc
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    </div>
  );
}
