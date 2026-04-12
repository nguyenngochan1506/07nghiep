import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Briefcase, FileText, DollarSign, Settings, Shield, Activity, Server } from "lucide-react";

import { Button } from "@07nghiep/ui/components/button";
import { Card } from "@07nghiep/ui/components/card";

export const Route = createFileRoute("/")({
  component: HomeComponent,
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

function HomeComponent() {
  return (
    <div className="min-h-screen bg-secondary/30 px-4 py-8">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold">Bảng điều khiển Admin</h1>
            <p className="text-muted-foreground">Tổng quan và quản lý hệ thống</p>
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
                <Link
                  key={action.label}
                  to={action.href}
                  className="inline-flex h-auto flex-col items-center gap-2 rounded-md border border-border bg-background p-4 text-center transition-colors hover:bg-muted hover:text-foreground"
                >
                  <action.icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{action.label}</span>
                </Link>
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
              <Link to="/">Xem báo cáo</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}