import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  MessageSquare,
  Settings,
  Calendar,
  Plus,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { ModeToggle } from "./mode-toggle";
import { NotificationBellContainer } from "./notification-bell-container";
import UserMenu from "./user-menu";
import { Badge } from "@07nghiep/ui/components/badge";
import { trpc } from "@/utils/trpc";

const employerNavItems: Array<{
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  hasMessageBadge?: boolean;
}> = [
  { icon: LayoutDashboard, label: "Bảng điều khiển", href: "/dashboard" },
  { icon: Plus, label: "Đăng tin mới", href: "/jobs/new" },
  { icon: Briefcase, label: "Quản lý tin đăng", href: "/my-jobs" },
  { icon: FileText, label: "Đơn ứng tuyển", href: "/applications" },
  { icon: MessageSquare, label: "Tin nhắn", href: "/messages", hasMessageBadge: true },
  { icon: Calendar, label: "Lịch phỏng vấn", href: "/interviews" },
  { icon: Settings, label: "Cài đặt", href: "/settings/organization" },
];

interface SidebarProps {
  children?: ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  const { data: unreadCount } = useQuery(
    trpc.conversation.getUnreadCount.queryOptions(undefined, {
      refetchInterval: 15000,
    }),
  );

  return (
    <div className="flex h-svh">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-card">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src="/07logo.png" alt="07nghiep" className="h-9 w-auto object-contain" />
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
                  <span className="flex-1">{item.label}</span>
                  {item.hasMessageBadge && unreadCount && unreadCount > 0 ? (
                    <Badge
                      variant="destructive"
                      className="h-4 min-w-4 rounded-full px-1 text-[10px]"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  ) : null}
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
          <UserMenu />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-auto">{children}</main>
    </div>
  );
}
