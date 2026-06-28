import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Building2,
  Shield,
  Activity,
  CreditCard,
  ReceiptText,
} from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import { NotificationBellContainer } from "./notification-bell-container";
import UserMenu from "./user-menu";
import { cn } from "@07nghiep/ui/lib/utils";

const adminNavItems = [
  { icon: LayoutDashboard, label: "Bảng điều khiển", href: "/dashboard" },
  { icon: Users, label: "Người dùng", href: "/admin/users" },
  { icon: Building2, label: "Duyệt công ty", href: "/admin/organizations" },
  { icon: Shield, label: "Yêu cầu doanh nghiệp", href: "/admin/business-applications" },
  { icon: Briefcase, label: "Duyệt việc làm", href: "/admin/jobs" },
  { icon: CreditCard, label: "Gói thanh toán", href: "/admin/billing" },
  { icon: ReceiptText, label: "Giao dịch", href: "/admin/billing/payments" },
];

interface SidebarProps {
  children?: ReactNode;
}

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getActiveHref(pathname: string) {
  return adminNavItems
    .filter((item) => isActiveRoute(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export default function Sidebar({ children }: SidebarProps) {
  const location = useLocation();
  const activeHref = getActiveHref(location.pathname);

  return (
    <div className="flex h-svh">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-card">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src="/07logo.png" alt="07nghiep" className="h-12 w-auto object-contain" />
            <span className="ml-1 rounded-sm bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">
              Admin
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="flex flex-col gap-1">
            {adminNavItems.map((item) => {
              const active = item.href === activeHref;

              return (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
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
      <main className="flex flex-1 flex-col overflow-auto">{children}</main>
    </div>
  );
}
