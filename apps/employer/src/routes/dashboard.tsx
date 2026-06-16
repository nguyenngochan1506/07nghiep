import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import {
  Plus,
  FileText,
  Eye,
  Briefcase,
  TrendingUp,
  Calendar,
  Users,
  Building,
  AlertCircle,
} from "lucide-react";

import { Button } from "@07nghiep/ui/components/button";
import { Card } from "@07nghiep/ui/components/card";
import { authorizedRoles } from "@/lib/role-guard";
import { authClient } from "@/lib/auth-client";
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

const _STATS = [
  { icon: Briefcase, label: "Việc đang tuyển", value: "12", change: "+2 tuần này" },
  { icon: FileText, label: "Đơn ứng tuyển", value: "45", change: "+8 mới" },
  { icon: Eye, label: "Tổng lượt xem", value: "1.2K", change: "+15%" },
  { icon: Users, label: "Ứng viên đã lưu", value: "28", change: "+5" },
];

const RECENT_ACTIVITY = [
  { text: "5 đơn ứng tuyển mới cho Senior Developer", time: "2 giờ trước" },
  { text: "Job 'Frontend Engineer' được xem 150 lần", time: "5 giờ trước" },
  { text: "3 việc hết hạn trong 7 ngày tới", time: "1 ngày trước" },
  { text: "Đánh giá mới từ ứng viên John D.", time: "2 ngày trước" },
];

type ErrorWithTRPCCode = {
  data?: {
    code?: string;
  };
};

function DashboardComponent() {
  const { session } = Route.useRouteContext();
  const statsQuery = useQuery(trpc.job.getMyStats.queryOptions());
  const stats = statsQuery.data;

  const orgQuery = useQuery({
    ...trpc.organization.getMyOrganization.queryOptions(),
    retry: false,
  });
  const isOrgMissing =
    orgQuery.isError && (orgQuery.error as unknown as ErrorWithTRPCCode).data?.code === "NOT_FOUND";

  const STAT_CARDS = [
    {
      icon: Briefcase,
      label: "Đang tuyển",
      value: stats?.openJobs ?? 0,
      change: `${stats?.draftJobs ?? 0} nháp`,
    },
    {
      icon: FileText,
      label: "Đơn ứng tuyển",
      value: stats?.totalApplications ?? 0,
      change: "Tất cả tin",
    },
    { icon: Eye, label: "Tổng lượt xem", value: stats?.totalViews ?? 0, change: "Tất cả tin" },
    {
      icon: Users,
      label: "Tổng tin đăng",
      value: stats?.totalJobs ?? 0,
      change: `${stats?.closedJobs ?? 0} đã đóng`,
    },
  ];

  return (
    <div className="min-h-screen bg-secondary/30 px-4 py-8">
      <div className="container mx-auto max-w-6xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Chào mừng, {session.data?.user.name}</h1>
          <p className="text-muted-foreground">Cập nhật tình trạng tin tuyển dụng của bạn</p>
        </div>

        {/* Missing Org Alert */}
        {isOrgMissing && (
          <Card className="mb-8 border-destructive/50 bg-destructive/10 p-5">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-destructive">
                  Chưa có thông tin công ty
                </h3>
                <p className="mt-1 text-sm text-destructive/90">
                  Bạn cần thiết lập hồ sơ công ty (Tên, Logo, Giới thiệu,...) trước khi có thể đăng
                  tin tuyển dụng.
                </p>
                <Link to="/settings/organization" className="mt-3 inline-block">
                  <Button size="sm" variant="destructive" className="gap-2">
                    <Building className="h-4 w-4" />
                    Tạo hồ sơ công ty ngay
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map((stat) => (
            <Card key={stat.label} className="p-5">
              <div className="flex items-center justify-between">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-3 text-2xl font-bold">{stat.value.toLocaleString("vi-VN")}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.change}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <TrendingUp className="h-5 w-5 text-primary" />
              Hoạt động gần đây
            </h2>
            <div className="space-y-4">
              {RECENT_ACTIVITY.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm">{activity.text}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Calendar className="h-5 w-5 text-primary" />
              Thao tác nhanh
            </h2>
            <div className="space-y-3">
              <Link to="/jobs/new">
                <Button className="w-full justify-start gap-3">
                  <Plus className="h-4 w-4" />
                  Đăng tin mới
                </Button>
              </Link>
              <Link to="/my-jobs">
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Briefcase className="h-4 w-4" />
                  Quản lý tin đăng
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start gap-3">
                <Users className="h-4 w-4" />
                Tìm kiếm CV
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <TrendingUp className="h-4 w-4" />
                Xem thống kê
              </Button>
            </div>
          </Card>
        </div>

        {/* CTA */}
        <Card className="mt-6 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold">Sẵn sàng tuyển dụng?</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Tiếp cận nhiều ứng viên hơn với tin tuyển dụng nổi bật
          </p>
          <Link to="/jobs/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Đăng tin tuyển dụng
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
