import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import { NotificationBellContainer } from "./notification-bell-container";
import UserMenu from "./user-menu";

export default function Header() {
  const navLinks = [
    { to: "/", label: "Bảng điều khiển" },
    { to: "/admin/users", label: "Người dùng" },
    { to: "/", label: "Việc làm" },
    { to: "/", label: "Báo cáo" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo & Branding */}
        <Link to="/" className="flex items-center gap-2">
          <img src="/07logo.png" alt="07nghiep" className="h-12 w-auto object-contain" />
          <span className="ml-1 rounded-sm bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">
            Admin
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden gap-1 md:flex">
          {navLinks.map(({ to, label }) => (
            <Link
              key={label}
              to={to}
              className="rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <NotificationBellContainer />
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
