import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, Menu } from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import { NotificationBellContainer } from "./notification-bell-container";
import UserMenu from "./user-menu";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@07nghiep/ui/components/sheet";
import { trpc } from "@/utils/trpc";

export default function Header() {
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session;

  const { data: unreadCount } = useQuery(
    trpc.conversation.getUnreadCount.queryOptions(undefined, {
      enabled: isLoggedIn,
      refetchInterval: 15000,
    }),
  );

  type NavLink = { to: string; label: string; hasMessageBadge?: boolean };

  const publicLinks: NavLink[] = [
    { to: "/jobs/", label: "Việc làm" },
    { to: "/organizations", label: "Công ty" },
  ];

  const protectedLinks: NavLink[] = [
    { to: "/saved-jobs", label: "Đã lưu" },
    { to: "/applications", label: "Đơn ứng tuyển" },
    { to: "/messages", label: "Tin nhắn", hasMessageBadge: true },
    { to: "/interviews", label: "Lịch PV" },
  ];

  const navLinks = isLoggedIn ? [...publicLinks, ...protectedLinks] : publicLinks;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex min-w-fit items-center gap-3">
          <img src="/07logo.png" alt="07nghiep" className="h-12 w-auto object-contain" />
          <div className="hidden flex-col leading-none sm:flex">
            <span className="text-sm font-semibold">07nghiep</span>
            <span className="text-xs text-muted-foreground">Candidate portal</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border bg-card p-1 shadow-sm lg:flex">
          {navLinks.map(({ to, label, hasMessageBadge }) => (
            <Link
              key={label}
              to={to}
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              className="relative flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {label}
              {hasMessageBadge && unreadCount && unreadCount > 0 ? (
                <Badge variant="destructive" className="h-4 min-w-4 rounded-full px-1 text-[10px]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="lg:hidden"
                  aria-label="Mở menu"
                />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-[20rem]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <BriefcaseBusiness className="size-4 text-primary" />
                  Candidate portal
                </SheetTitle>
                <SheetDescription>Điều hướng nhanh trong tài khoản ứng viên.</SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {navLinks.map(({ to, label, hasMessageBadge }) => (
                  <Link
                    key={label}
                    to={to}
                    activeProps={{ className: "bg-secondary text-secondary-foreground" }}
                    className="flex h-10 items-center justify-between rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <span>{label}</span>
                    {hasMessageBadge && unreadCount && unreadCount > 0 ? (
                      <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    ) : null}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          {isLoggedIn && <NotificationBellContainer />}
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
