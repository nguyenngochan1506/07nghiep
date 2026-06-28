import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building,
  CheckCircle2,
  CreditCard,
  Eye,
  FileText,
  MessageSquare,
  Plus,
  Users,
} from "lucide-react";

import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@07nghiep/ui/components/card";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { authClient } from "@/lib/auth-client";
import { authorizedRoles } from "@/lib/role-guard";
import { trpc } from "@/utils/trpc";

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
  component: DashboardComponent,
});

type ErrorWithTRPCCode = {
  data?: {
    code?: string;
  };
};

const formatter = new Intl.NumberFormat("vi-VN");

function formatNumber(value?: number) {
  return formatter.format(value ?? 0);
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function DashboardComponent() {
  const { session } = Route.useRouteContext();
  const statsQuery = useQuery(trpc.job.getMyStats.queryOptions());
  const billingQuery = useQuery(trpc.billing.me.queryOptions());
  const employerActive = billingQuery.data?.entitlements.employer ?? false;

  const orgQuery = useQuery({
    ...trpc.organization.getMyOrganization.queryOptions(),
    retry: false,
  });
  const isOrgMissing =
    orgQuery.isError && (orgQuery.error as unknown as ErrorWithTRPCCode).data?.code === "NOT_FOUND";

  const recentJobsQuery = useQuery({
    ...trpc.job.getMyJobs.queryOptions({ page: 1, pageSize: 4 }),
    enabled: Boolean(orgQuery.data),
  });

  const stats = statsQuery.data;
  const organization = orgQuery.data;
  const profileComplete = Boolean(
    organization?.name && organization.description && organization.location,
  );

  const statCards = [
    {
      icon: Briefcase,
      label: "Đang tuyển",
      value: stats?.openJobs,
      detail: `${formatNumber(stats?.draftJobs)} bản nháp cần hoàn thiện`,
      href: "/my-jobs",
    },
    {
      icon: FileText,
      label: "Đơn ứng tuyển",
      value: stats?.totalApplications,
      detail: "Tổng số hồ sơ từ các tin đăng",
      href: "/applications",
    },
    {
      icon: Eye,
      label: "Lượt xem",
      value: stats?.totalViews,
      detail: `${formatNumber(stats?.totalJobs)} tin tuyển dụng đã tạo`,
      href: "/my-jobs",
    },
    {
      icon: Users,
      label: "Tin đã đóng",
      value: stats?.closedJobs,
      detail: "Theo dõi để tái đăng khi cần",
      href: "/my-jobs",
    },
  ] as const;

  const readinessItems = [
    {
      icon: CreditCard,
      label: "Gói nhà tuyển dụng",
      ready: employerActive,
      detail: employerActive ? "Đang hoạt động" : "Cần kích hoạt để dùng đầy đủ tính năng",
      href: "/billing",
      action: employerActive ? "Xem gói" : "Kích hoạt",
    },
    {
      icon: Building,
      label: "Hồ sơ công ty",
      ready: !isOrgMissing && profileComplete,
      detail: isOrgMissing
        ? "Chưa tạo hồ sơ công ty"
        : profileComplete
          ? "Đủ thông tin cơ bản"
          : "Thiếu mô tả hoặc địa điểm công ty",
      href: "/settings/organization",
      action: isOrgMissing ? "Tạo hồ sơ" : "Cập nhật",
    },
    {
      icon: CheckCircle2,
      label: "Xác minh công ty",
      ready: organization?.verified ?? false,
      detail: organization?.verified
        ? "Công ty đã được xác minh"
        : `Trạng thái: ${organization?.verificationStatus ?? "chưa có hồ sơ"}`,
      href: "/settings/organization",
      action: "Kiểm tra",
    },
    {
      icon: Briefcase,
      label: "Tin đang hiển thị",
      ready: (stats?.openJobs ?? 0) > 0,
      detail:
        (stats?.openJobs ?? 0) > 0
          ? `${formatNumber(stats?.openJobs)} tin đang mở`
          : "Chưa có tin tuyển dụng đang mở",
      href: "/jobs/new",
      action: "Đăng tin",
    },
  ] as const;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
        <section className="grid gap-4 xl:grid-cols-[1fr_24rem]">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="gap-4 p-6">
              <Badge variant={employerActive ? "secondary" : "destructive"} className="w-fit">
                {employerActive ? "Nhà tuyển dụng đang hoạt động" : "Cần kích hoạt gói"}
              </Badge>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                    Chào {session.data?.user.name}, đây là tình hình tuyển dụng của bạn
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                    Bảng điều khiển tập trung vào những việc cần xử lý trước: kích hoạt gói, hoàn
                    thiện công ty, mở tin tuyển dụng và theo dõi hồ sơ ứng viên.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="lg">
                    <Link to="/jobs/new">
                      <Plus data-icon="inline-start" />
                      Đăng tin mới
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/applications">
                      <FileText data-icon="inline-start" />
                      Xem ứng viên
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Việc cần làm</CardTitle>
              <CardDescription>Hoàn thiện các bước để tuyển dụng ổn định</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {readinessItems.slice(0, 3).map((item) => (
                <Link key={item.label} to={item.href} className="rounded-lg border p-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={
                        item.ready
                          ? "flex size-8 items-center justify-center rounded-md bg-success/10 text-success"
                          : "flex size-8 items-center justify-center rounded-md bg-warning/10 text-warning"
                      }
                    >
                      {item.ready ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <AlertCircle className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <stat.icon className="size-4 text-primary" />
                  {stat.label}
                </CardTitle>
                <CardAction>
                  <Button asChild variant="ghost" size="sm">
                    <Link to={stat.href}>Mở</Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                {statsQuery.isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-3xl font-semibold tabular-nums">{formatNumber(stat.value)}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">{stat.detail}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        {(isOrgMissing || (!billingQuery.isLoading && !employerActive)) && (
          <Card className="border-warning/40 bg-warning/10 shadow-sm">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-5 text-warning" />
                <div>
                  <p className="font-medium">Tài khoản chưa sẵn sàng để tuyển dụng đầy đủ</p>
                  <p className="text-sm text-muted-foreground">
                    {isOrgMissing
                      ? "Bạn cần tạo hồ sơ công ty trước khi đăng tin tuyển dụng."
                      : "Gói nhà tuyển dụng chưa hoạt động hoặc đã hết hạn."}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link to={isOrgMissing ? "/settings/organization" : "/billing"}>
                  {isOrgMissing ? "Tạo hồ sơ công ty" : "Xem thanh toán"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <section className="grid gap-6 xl:grid-cols-[1fr_24rem]">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Tin tuyển dụng gần đây</CardTitle>
              <CardDescription>Theo dõi trạng thái và hiệu quả từng tin</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {recentJobsQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))
              ) : recentJobsQuery.data?.jobs.length ? (
                recentJobsQuery.data.jobs.map((job) => (
                  <Link
                    key={job.id}
                    to="/my-jobs/$jobId/edit"
                    params={{ jobId: job.id }}
                    className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{job.title}</p>
                        <Badge variant="outline">{job.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Cập nhật {formatDate(job.updatedAt)} · {formatNumber(job.applicationsCount)}{" "}
                        hồ sơ · {formatNumber(job.views)} lượt xem
                      </p>
                    </div>
                    <ArrowRight className="size-4 self-center text-muted-foreground" />
                  </Link>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="font-medium">Chưa có tin tuyển dụng</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tạo tin đầu tiên để bắt đầu nhận hồ sơ ứng viên.
                  </p>
                  <Button asChild className="mt-4">
                    <Link to="/jobs/new">
                      <Plus data-icon="inline-start" />
                      Đăng tin mới
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Lối tắt vận hành</CardTitle>
              <CardDescription>Các màn hình dùng hằng ngày</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {[
                { icon: Plus, label: "Đăng tin tuyển dụng", href: "/jobs/new" },
                { icon: Briefcase, label: "Quản lý tin đăng", href: "/my-jobs" },
                { icon: FileText, label: "Xử lý đơn ứng tuyển", href: "/applications" },
                { icon: MessageSquare, label: "Tin nhắn ứng viên", href: "/messages" },
                { icon: CreditCard, label: "Thanh toán và gói", href: "/billing" },
                { icon: Building, label: "Hồ sơ công ty", href: "/settings/organization" },
              ].map((action) => (
                <Button key={action.label} asChild variant="outline" className="justify-start">
                  <Link to={action.href}>
                    <action.icon data-icon="inline-start" />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
