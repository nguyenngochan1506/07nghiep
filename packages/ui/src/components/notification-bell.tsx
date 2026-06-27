import { Bell } from "lucide-react";
import { cn } from "../lib/utils";
import { Badge } from "./badge";
import { Button, buttonVariants } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export type NotificationType =
  | "APPLICATION_RECEIVED"
  | "APPLICATION_STATUS"
  | "MESSAGE"
  | "JOB_ALERT"
  | "SYSTEM"
  | "INTERVIEW_INVITATION";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  unreadCount: number;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Vừa xong";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} ngày trước`;

  return date.toLocaleDateString("vi-VN");
}

export function NotificationBell({
  unreadCount,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationBellProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
      >
        <Bell />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full p-0 text-[10px]"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold">Thông báo</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground hover:bg-transparent"
            >
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="flex max-h-[350px] flex-col overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Không có thông báo nào
            </div>
          ) : (
            notifications.map((n) => (
              <button
                type="button"
                key={n.id}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/50",
                  !n.read && "bg-primary/5",
                )}
                onClick={() => !n.read && onMarkAsRead(n.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium leading-tight">{n.title}</span>
                  {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>
                <span className="text-[10px] text-muted-foreground">
                  {getRelativeTime(n.createdAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
