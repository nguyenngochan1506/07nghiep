import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Users, Briefcase, FileText, DollarSign, Settings, Shield, Activity, Server } from "lucide-react";

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
    const user = session.data!.user as { role?: string };
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

const STATS = [
  { icon: Users, label: "Tổng người dùng", value: "234", change: "+12" },
  { icon: Briefcase, label: "Việc làm đang tuyển", value: "156", change: "+8" },
  { icon: FileText, label: "Đơn ứng tuyển", value: "892", change: "+45" },
  { icon: DollarSign, label: "Doanh thu", value: "$12.5K", change: "+18%" },
];

const SYSTEM_STATUS = [
  { label: "API Server", status: "healthy", detail: "Phản hồi: 45ms" },
  { label: "Database", status: "healthy", detail: "Kết nối: 23" },
  { label: "Cache", status: "healthy", detail: "Tỷ lệ hit: 94%" },
  { label: "Email Service", status: "healthy", detail: "Gửi lần cuối: 2p trước" },
];

const QUICK_ACTIONS = [
  { icon: Users, label: "Quản lý người dùng", href: "/" },
  { icon: Briefcase, label: "Duyệt việc làm", href: "/" },
  { icon: Shield, label: "Bảo mật", href: "/" },
  { icon: Settings, label: "Cài đặt", href: "/" },
];

function DashboardComponent() {
  const { session } = Route.useRouteContext();
  const privateData = useQuery(trpc.privateData.queryOptions());

  return (
    <div className="min-h-screen bg-secondary/30 px-4 py-8">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold">Bảng điều khiển Admin</h1>
            <p className="text-muted-foreground">
              Xin chào {session.data?.user.name} • Tổng quan và quản lý hệ thống
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-success">
            <Activity className="h-4 w-4" />
            Hệ thống đang hoạt động
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <Card key={stat.label} className="p-5">
              <div className="flex items-center justify-between">
                <stat.icon className="h-5 w-5 text-primary" />
                <span className="text-xs text-success">{stat.change}</span>
              </div>
              <p className="mt-3 text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* System Status */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Server className="h-5 w-5 text-primary" />
              Trạng thái hệ thống
            </h2>
            <div className="space-y-4">
              {SYSTEM_STATUS.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <span className="text-xs text-success">Khỏe mạnh</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Shield className="h-5 w-5 text-primary" />
              Thao tác nhanh
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-auto flex-col py-4 gap-2"
                >
                  <action.icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{action.label}</span>
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Reports Summary */}
        <Card className="mt-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Báo cáo tháng này</h3>
              <p className="text-sm text-muted-foreground">
                Tạo lúc ngày 13 tháng 4 năm 2026
              </p>
            </div>
            <Button variant="outline">
              Xem báo cáo
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
