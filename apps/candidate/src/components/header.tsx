import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import { NotificationBellContainer } from "./notification-bell-container";
import UserMenu from "./user-menu";
import { authClient } from "@/lib/auth-client";

export default function Header() {
    const { data: session } = authClient.useSession();
    const isLoggedIn = !!session;

    const publicLinks = [
        { to: "/jobs/", label: "Việc làm" },
        { to: "/organizations", label: "Công ty" },
    ];

    const protectedLinks = [
        { to: "/saved-jobs", label: "Đã lưu" },
        { to: "/applications", label: "Đơn ứng tuyển" },
        { to: "/messages", label: "Tin nhắn" },
        { to: "/interviews", label: "Lịch PV" },
    ];

    const navLinks = isLoggedIn ? [...publicLinks, ...protectedLinks] : publicLinks;

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-14 items-center justify-between px-4">
                {/* Logo & Branding */}
                <Link to="/" className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-sm font-bold text-primary-foreground">
                        07
                    </div>
                    <span className="font-semibold">07nghiep</span>
                </Link>

                {/* Navigation */}
                <nav className="hidden gap-1 md:flex">
                    {navLinks.map(({ to, label }) => (
                        <Link
                            key={label}
                            to={to}
                            activeProps={{ className: "bg-secondary text-foreground font-bold" }}
                            className="rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                            {label}
                        </Link>
                    ))}
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {isLoggedIn && <NotificationBellContainer />}
                    <ModeToggle />
                    <UserMenu />
                </div>
            </div>
        </header>
    );
}
