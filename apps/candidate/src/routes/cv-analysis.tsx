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
import { Separator } from "@07nghiep/ui/components/separator";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileSearch,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
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
  const canAnalyze = isPlus && remaining > 0 && hasResume && !createAnalysisMutation.isPending;
  const status = latest?.status ?? null;
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
                {isPlus ? `${remaining} lượt còn lại trong kỳ hiện tại` : "Cần Candidate Plus"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button
                disabled={!canAnalyze}
                onClick={() => createAnalysisMutation.mutate()}
                className="w-full"
              >
                {createAnalysisMutation.isPending ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Sparkles data-icon="inline-start" />
                )}
                Phân tích CV hiện tại
              </Button>
              {!isPlus ? (
                <Button asChild variant="outline" className="w-full">
                  <Link to="/billing">Nâng cấp Plus</Link>
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

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[380px_1fr]">
        <aside className="flex flex-col gap-5">
          <ScoreCard latest={latest} loading={latestQuery.isLoading} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSearch className="size-4 text-primary" />
                Trạng thái
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Phân tích gần nhất</span>
                <Badge variant={getStatusVariant(status)}>
                  {statusLabels[status ?? ""] ?? "Chưa có"}
                </Badge>
              </div>
              {latest?.errorMessage ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {latest.errorMessage}
                </p>
              ) : null}
              <Separator />
              <div className="grid gap-2 text-sm">
                <StatusLine
                  icon={isPlus ? CheckCircle2 : AlertCircle}
                  label={isPlus ? "Plus đang hoạt động" : "Chưa có Candidate Plus"}
                />
                <StatusLine
                  icon={hasResume ? CheckCircle2 : AlertCircle}
                  label={hasResume ? "Đã có CV trong hồ sơ" : "Chưa có CV trong hồ sơ"}
                />
              </div>
            </CardContent>
          </Card>
        </aside>

        <div className="flex flex-col gap-5">
          <InsightGrid strengths={strengths} weaknesses={weaknesses} suggestions={suggestions} />
          <SkillsCard skills={latest?.extractedSkills ?? []} />
          <RecommendedJobsCard jobs={recommendedJobs} loading={recommendedJobsQuery.isLoading} />
        </div>
      </section>
    </main>
  );
}

function ScoreCard({ latest, loading }: { latest?: LatestAnalysis | null; loading: boolean }) {
  if (loading) {
    return <Skeleton className="h-56 rounded-xl" />;
  }

  const score = latest?.overallScore ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Điểm CV</CardTitle>
        <CardDescription>{latest?.summary ?? "Chưa có bản phân tích nào."}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <span className="text-5xl font-semibold tabular-nums">{score}</span>
          <span className="pb-2 text-sm text-muted-foreground">/ 100</span>
        </div>
        <Progress value={score} />
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
    <div className="grid gap-4 md:grid-cols-3">
      <InsightCard title="Điểm mạnh" items={strengths} empty="Chưa có dữ liệu" />
      <InsightCard title="Cần cải thiện" items={weaknesses} empty="Chưa có dữ liệu" />
      <InsightCard title="Gợi ý chỉnh CV" items={suggestions} empty="Chưa có dữ liệu" />
    </div>
  );
}

function InsightCard({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <ul className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
            {items.slice(0, 5).map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
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

function RecommendedJobsCard({
  jobs,
  loading,
}: {
  jobs: RecommendedJobs;
  loading: boolean;
}) {
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

function StatusLine({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-primary" />
      <span>{label}</span>
    </div>
  );
}
