import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Building2,
  FileText,
  BarChart3,
  Settings,
  Shield,
  Activity,
} from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import { NotificationBellContainer } from "./notification-bell-container";
import UserMenu from "./user-menu";

const adminNavItems = [
  { icon: LayoutDashboard, label: "Bảng điều khiển", href: "/dashboard" },
  { icon: Users, label: "Người dùng", href: "/admin/users" },
  { icon: Building2, label: "Duyệt công ty", href: "/admin/organizations" },
  { icon: Briefcase, label: "Duyệt việc làm", href: "/admin/jobs" },
  { icon: FileText, label: "Đơn ứng tuyển", href: "/" },
  { icon: BarChart3, label: "Báo cáo", href: "/" },
  { icon: Shield, label: "Bảo mật", href: "/" },
  { icon: Settings, label: "Cài đặt", href: "/" },
];

interface SidebarProps {
  children?: ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  return (
    <div className="flex h-svh">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-card">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-sm font-bold text-primary-foreground">
              07
            </div>
            <span className="font-semibold">07nghiep</span>
            <span className="ml-1 rounded-sm bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">
              Admin
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {adminNavItems.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t p-3">
          <div className="mb-2 flex items-center justify-between">
            <NotificationBellContainer />
            <ModeToggle />
          </div>
          <div className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-success">
            <Activity className="h-3 w-3" />
            Hệ thống hoạt động
          </div>
          <UserMenu />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-auto">
        {children}
      </main>
    </div>
  );
}
