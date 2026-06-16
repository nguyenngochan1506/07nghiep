import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { ModeToggle } from "./mode-toggle";
import { NotificationBellContainer } from "./notification-bell-container";
import UserMenu from "./user-menu";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@07nghiep/ui/components/badge";
import { trpc } from "@/utils/trpc";

export default function Header() {
    const { data: session } = authClient.useSession();
    const isLoggedIn = !!session;

    const { data: unreadCount } = useQuery(
        trpc.conversation.getUnreadCount.queryOptions(undefined, {
            enabled: isLoggedIn,
            refetchInterval: 15000,
        })
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
                    {navLinks.map(({ to, label, hasMessageBadge }) => (
                        <Link
                            key={label}
                            to={to}
                            activeProps={{ className: "bg-secondary text-foreground font-bold" }}
                            className="relative flex items-center gap-1 rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
