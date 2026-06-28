import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import { NotificationBellContainer } from "./notification-bell-container";
import UserMenu from "./user-menu";

export default function Header() {
  const navLinks = [
    { to: "/", label: "Tin đăng" },
    { to: "/", label: "Đơn ứng tuyển" },
    { to: "/", label: "Tìm CV" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo & Branding */}
        <Link to="/" className="flex items-center gap-2">
          <img src="/07logo.png" alt="07nghiep" className="h-12 w-auto object-contain" />
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
          <Link
            to="/"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Đăng tin mới
          </Link>
          <NotificationBellContainer />
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
