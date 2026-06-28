import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  Activity,
  Briefcase,
  Building2,
  CreditCard,
  FileText,
  ReceiptText,
  ShieldCheck,
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

const formatter = new Intl.NumberFormat("vi-VN");
const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  style: "currency",
});

function formatNumber(value?: number) {
  return formatter.format(value ?? 0);
}

function formatCurrency(value?: number) {
  return currencyFormatter.format(value ?? 0);
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
  const summaryQuery = useQuery(trpc.admin.summary.overview.queryOptions());
  const summary = summaryQuery.data;

  const statCards = [
    {
      icon: Users,
      label: "Người dùng",
      value: summary?.users.total,
      detail: `${formatNumber(summary?.users.candidates)} ứng viên · ${formatNumber(
        summary?.users.employers,
      )} nhà tuyển dụng`,
      href: "/admin/users",
    },
    {
      icon: Briefcase,
      label: "Việc đang mở",
      value: summary?.jobs.open,
      detail: `${formatNumber(summary?.jobs.pendingApproval)} tin chờ duyệt`,
      href: "/admin/jobs",
    },
    {
      icon: FileText,
      label: "Đơn ứng tuyển",
      value: summary?.applications.total,
      detail: `${formatNumber(summary?.applications.newLast7Days)} đơn mới trong 7 ngày`,
      href: "/admin/users",
    },
    {
      icon: ReceiptText,
      label: "Doanh thu đã thanh toán",
      value: summary?.billing.paidRevenueVnd,
      detail: `${formatNumber(summary?.billing.paidPayments)} giao dịch thành công`,
      href: "/admin/billing/payments",
      currency: true,
    },
  ];

  const reviewQueues = [
    {
      icon: ShieldCheck,
      label: "Yêu cầu doanh nghiệp",
      value: summary?.businessApplications.pending,
      detail: "Duyệt hồ sơ để mở gói nhà tuyển dụng",
      href: "/admin/business-applications",
    },
    {
      icon: Briefcase,
      label: "Tin tuyển dụng",
      value: summary?.jobs.pendingApproval,
      detail: "Kiểm tra nội dung trước khi công khai",
      href: "/admin/jobs",
    },
    {
      icon: Building2,
      label: "Xác minh công ty",
      value: summary?.organizations.pending,
      detail: "Hồ sơ công ty đang chờ xác thực",
      href: "/admin/organizations",
    },
    {
      icon: CreditCard,
      label: "Giao dịch cần soát",
      value: summary?.billing.reviewRequired,
      detail: `${formatNumber(summary?.billing.pendingPayments)} giao dịch đang chờ thanh toán`,
      href: "/admin/billing/payments",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
        <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader className="gap-3 p-6">
              <Badge variant="outline" className="w-fit">
                Admin workspace
              </Badge>
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="max-w-3xl">
                  <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                    Theo dõi vận hành tuyển dụng trong một màn hình
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                    Xin chào {session.data?.user.name}. Các số liệu bên dưới lấy trực tiếp từ hệ
                    thống để ưu tiên hàng đợi duyệt, tài khoản và thanh toán.
                  </p>
                </div>
                <Button asChild size="lg">
                  <Link to="/admin/jobs">
                    <Briefcase data-icon="inline-start" />
                    Duyệt tin chờ
                  </Link>
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-border/70 bg-primary text-primary-foreground shadow-sm">
            <CardHeader className="p-6">
              <CardTitle className="flex items-center gap-2 text-primary-foreground">
                <Activity className="size-4" />
                Tình trạng xử lý
              </CardTitle>
              <CardDescription className="text-primary-foreground/75">
                Hàng đợi ưu tiên hôm nay
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {summaryQuery.isLoading ? (
                <Skeleton className="h-16 bg-primary-foreground/20" />
              ) : (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatNumber(summary?.jobs.pendingApproval)}
                    </p>
                    <p className="text-xs text-primary-foreground/70">tin chờ</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatNumber(summary?.businessApplications.pending)}
                    </p>
                    <p className="text-xs text-primary-foreground/70">yêu cầu</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatNumber(summary?.billing.reviewRequired)}
                    </p>
                    <p className="text-xs text-primary-foreground/70">giao dịch</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {summaryQuery.isError ? (
          <Card className="border-destructive/40 bg-destructive/10">
            <CardContent className="p-5 text-sm text-destructive">
              Không tải được dữ liệu dashboard. Vui lòng thử lại sau.
            </CardContent>
          </Card>
        ) : null}

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
                {summaryQuery.isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-3xl font-semibold tabular-nums">
                    {stat.currency ? formatCurrency(stat.value) : formatNumber(stat.value)}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">{stat.detail}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_24rem]">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Hàng đợi cần xử lý</CardTitle>
              <CardDescription>
                Các khu vực có ảnh hưởng trực tiếp tới cung tuyển dụng
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {reviewQueues.map((queue) => (
                <Link key={queue.label} to={queue.href} className="group rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-primary">
                        <queue.icon className="size-4" />
                      </span>
                      <div>
                        <p className="font-medium">{queue.label}</p>
                        <p className="text-xs text-muted-foreground">{queue.detail}</p>
                      </div>
                    </div>
                    {summaryQuery.isLoading ? (
                      <Skeleton className="h-6 w-10" />
                    ) : (
                      <Badge variant={(queue.value ?? 0) > 0 ? "default" : "secondary"}>
                        {formatNumber(queue.value)}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Đi tới xử lý
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Tăng trưởng 7 ngày</CardTitle>
              <CardDescription>Chỉ số mới phát sinh gần đây</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {[
                ["Người dùng mới", summary?.users.newLast7Days],
                ["Tin tuyển dụng mới", summary?.jobs.newLast7Days],
                ["Đơn ứng tuyển mới", summary?.applications.newLast7Days],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg bg-muted/45 p-3"
                >
                  <span className="text-sm text-muted-foreground">{label}</span>
                  {summaryQuery.isLoading ? (
                    <Skeleton className="h-6 w-12" />
                  ) : (
                    <span className="text-lg font-semibold tabular-nums">
                      {formatNumber(value as number)}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Tin tuyển dụng cập nhật gần đây</CardTitle>
              <CardDescription>Những thay đổi mới nhất từ nhà tuyển dụng</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {summaryQuery.isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))
                : summary?.recent.jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between gap-4 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{job.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {job.organization.name} · {formatDate(job.updatedAt)}
                        </p>
                      </div>
                      <Badge variant="outline">{job.status}</Badge>
                    </div>
                  ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Yêu cầu doanh nghiệp mới</CardTitle>
              <CardDescription>Hồ sơ đăng ký gói nhà tuyển dụng gần nhất</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {summaryQuery.isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))
                : summary?.recent.businessApplications.map((application) => (
                    <div
                      key={application.id}
                      className="flex items-center justify-between gap-4 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{application.companyName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {application.user.name} · {formatDate(application.createdAt)}
                        </p>
                      </div>
                      <Badge variant={application.status === "PENDING" ? "default" : "outline"}>
                        {application.status}
                      </Badge>
                    </div>
                  ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
