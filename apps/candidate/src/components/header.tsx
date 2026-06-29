import { useLocation } from "@tanstack/react-router";
import { BriefcaseBusiness, Menu } from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import { Button } from "@07nghiep/ui/components/button";
import { cn } from "@07nghiep/ui/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@07nghiep/ui/components/sheet";

export default function Header() {
  const location = useLocation();
  type NavLink = { to: string; label: string };

  const publicLinks: NavLink[] = [
    { to: "/home", label: "Trang chủ" },
    { to: "/jobs/", label: "Việc làm" },
    { to: "/organizations", label: "Công ty" },
    { to: "/saved-jobs", label: "Đã lưu" },
    { to: "/billing", label: "Plus" },
  ];

  const activePath = location.pathname.replace(/\/$/, "") || "/";
  const isActive = (to: string) => activePath === (to.replace(/\/$/, "") || "/");

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <a href="/" className="flex min-w-fit items-center gap-3">
          <img src="/07logo.png" alt="07nghiep" className="h-12 w-auto object-contain" />
        </a>

        <nav className="hidden items-center gap-1 rounded-full border bg-surface-wash p-1 shadow-sm lg:flex">
          {publicLinks.map(({ to, label }) => (
            <a
              key={label}
              href={to}
              className={cn(
                "relative flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                isActive(to) && "bg-primary text-primary-foreground shadow-sm",
              )}
            >
              {label}
            </a>
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
                {publicLinks.map(({ to, label }) => (
                  <a
                    key={label}
                    href={to}
                    className={cn(
                      "flex h-10 items-center justify-between rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                      isActive(to) && "bg-primary text-primary-foreground",
                    )}
                  >
                    <span>{label}</span>
                  </a>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
