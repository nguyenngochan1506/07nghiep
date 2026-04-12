import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Plus, FileText, Eye, Briefcase, TrendingUp, Calendar, Users } from "lucide-react";

import { Button } from "@07nghiep/ui/components/button";
import { Card } from "@07nghiep/ui/components/card";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({
        to: "/login",
        throw: true,
      });
    }
    return { session };
  },
  component: DashboardComponent,
});

const STATS = [
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

function DashboardComponent() {
  const { session } = Route.useRouteContext();
  const privateData = useQuery(trpc.privateData.queryOptions());

  return (
    <div className="min-h-screen bg-secondary/30 px-4 py-8">
      <div className="container mx-auto max-w-6xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Chào mừng, {session.data?.user.name}</h1>
          <p className="text-muted-foreground">
            Cập nhật tình trạng tin tuyển dụng của bạn
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <Card key={stat.label} className="p-5">
              <div className="flex items-center justify-between">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-3 text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-xs text-success">{stat.change}</p>
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
              <Button className="w-full justify-start gap-3">
                <Plus className="h-4 w-4" />
                Đăng tin mới
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <Briefcase className="h-4 w-4" />
                Quản lý tin đăng
              </Button>
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
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Đăng tin tuyển dụng
          </Button>
        </Card>
      </div>
    </div>
  );
}
