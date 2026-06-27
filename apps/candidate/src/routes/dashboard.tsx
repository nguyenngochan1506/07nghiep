import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  Heart,
  MessageSquareText,
  Search,
  ShieldCheck,
} from "lucide-react";

import { authorizedRoles } from "@/lib/role-guard";
import { authClient } from "@/lib/auth-client";
import { useJobs } from "@/routes/__root";
import { trpc } from "@/utils/trpc";
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
import { Skeleton } from "@07nghiep/ui/components/skeleton";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    const user = session.data?.user as { role?: string };
    const role = user.role ?? "CANDIDATE";
    if (!authorizedRoles(role)) {
      toast.error("Bạn không có quyền truy cập trang này");
      await authClient.signOut();
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const { jobs, isLoading: jobsLoading } = useJobs();

  const privateData = useQuery(trpc.privateData.queryOptions());
  const savedJobsQuery = useQuery(trpc.savedJob.list.queryOptions({ pageSize: 3 }));
  const applicationsQuery = useQuery(trpc.applications.list.queryOptions({}));
  const unreadCountQuery = useQuery(trpc.conversation.getUnreadCount.queryOptions());

  const candidateName = session.data?.user.name || "Ứng viên";
  const recommendedJobs = jobs.slice(0, 3);
  const savedCount = savedJobsQuery.data?.jobs.length ?? 0;
  const applicationsCount = Array.isArray(applicationsQuery.data)
    ? applicationsQuery.data.length
    : 0;
  const unreadCount = unreadCountQuery.data ?? 0;

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <section className="border-b bg-primary px-4 py-10 text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex max-w-3xl flex-col gap-3">
            <Badge className="w-fit bg-brand-orange text-brand-orange-foreground">
              Today workspace
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Chào {candidateName}, tiếp tục tìm việc hiệu quả hơn.
            </h1>
            <p className="text-base leading-7 text-primary-foreground/75">
              Theo dõi việc đã lưu, đơn ứng tuyển, tin nhắn và lịch phỏng vấn trong một màn hình gọn
              để không bỏ lỡ bước tiếp theo.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <Button
              asChild
              className="bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90"
            >
              <Link to="/jobs">
                <Search data-icon="inline-start" />
                Tìm việc mới
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15"
            >
              <Link to="/profile">
                Cập nhật hồ sơ
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <section className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              icon={Heart}
              label="Việc đã lưu"
              value={savedJobsQuery.isLoading ? "..." : String(savedCount)}
              href="/saved-jobs"
            />
            <MetricCard
              icon={BriefcaseBusiness}
              label="Đơn ứng tuyển"
              value={applicationsQuery.isLoading ? "..." : String(applicationsCount)}
              href="/applications"
            />
            <MetricCard
              icon={MessageSquareText}
              label="Tin nhắn mới"
              value={unreadCountQuery.isLoading ? "..." : String(unreadCount)}
              href="/messages"
            />
          </div>

          <Card className="shadow-md shadow-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Việc nên xem tiếp</CardTitle>
              <CardDescription>
                Các tin mới nhất trong hệ thống để bạn nhanh chóng mở chi tiết hoặc lưu lại.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {jobsLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-xl" />
                ))
              ) : recommendedJobs.length > 0 ? (
                recommendedJobs.map((job) => (
                  <Link
                    key={job.id}
                    to="/jobs/$jobId"
                    params={{ jobId: job.id }}
                    className="grid gap-3 rounded-xl border bg-surface-wash/60 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-orange/50 hover:shadow-sm md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">{job.title}</h2>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {job.companyName} · {job.location || "Linh hoạt"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <Badge variant="secondary">{job.workType || "Đang cập nhật"}</Badge>
                      <Badge variant="outline" className="border-brand-orange/30 text-primary">
                        {job.salaryRange}
                      </Badge>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  Chưa có việc mới để gợi ý. Hãy quay lại trang tìm việc để mở toàn bộ danh sách.
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                asChild
                className="w-full bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90"
              >
                <Link to="/jobs">
                  Xem tất cả việc làm
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </section>

        <aside className="flex flex-col gap-4">
          <Card className="bg-surface-wash/70">
            <CardHeader>
              <CardTitle className="text-base">Trạng thái tài khoản</CardTitle>
              <CardDescription>
                {privateData.isLoading
                  ? "Đang kiểm tra phiên đăng nhập."
                  : privateData.data?.message || "Phiên đăng nhập đã sẵn sàng."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <StatusItem icon={ShieldCheck} title="Quyền truy cập" text="Candidate portal" />
              <StatusItem icon={Bell} title="Thông báo" text={`${unreadCount} tin chưa đọc`} />
              <StatusItem icon={CalendarClock} title="Lịch phỏng vấn" text="Theo dõi lịch hẹn" />
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground shadow-md shadow-primary/10">
            <CardHeader>
              <CardTitle className="text-base">Hồ sơ càng rõ, ứng tuyển càng nhanh</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Bổ sung CV, kỹ năng và portfolio trước khi gửi đơn vào vị trí mới.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                asChild
                className="w-full bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90"
              >
                <Link to="/profile/edit">Hoàn thiện hồ sơ</Link>
              </Button>
            </CardFooter>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Heart;
  label: string;
  value: string;
  href: "/saved-jobs" | "/applications" | "/messages";
}) {
  return (
    <Card className="bg-card shadow-sm shadow-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{label}</CardTitle>
          <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
      </CardContent>
      <CardFooter>
        <Button asChild variant="ghost" size="sm" className="w-full justify-between text-primary">
          <Link to={href}>
            Mở
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function StatusItem({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
