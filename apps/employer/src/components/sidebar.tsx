import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Users,
  BarChart3,
  MessageSquare,
  Settings,
  TrendingUp,
  Calendar,
  Plus,
} from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const employerNavItems = [
  { icon: LayoutDashboard, label: "Bảng điều khiển", href: "/dashboard" },
  { icon: Plus, label: "Đăng tin mới", href: "/" },
  { icon: Briefcase, label: "Quản lý tin đăng", href: "/" },
  { icon: FileText, label: "Đơn ứng tuyển", href: "/" },
  { icon: Users, label: "Tìm kiếm CV", href: "/" },
  { icon: MessageSquare, label: "Tin nhắn", href: "/" },
  { icon: TrendingUp, label: "Thống kê", href: "/" },
  { icon: Calendar, label: "Lịch phỏng vấn", href: "/" },
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
            <span className="ml-1 rounded-sm bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              Employer
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {employerNavItems.map((item) => (
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
          <UserMenu />
          <div className="mt-2 flex justify-end">
            <ModeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-auto">
        {children}
      </main>
    </div>
  );
}
