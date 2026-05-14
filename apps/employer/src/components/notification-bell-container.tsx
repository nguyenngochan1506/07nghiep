import { useEffect } from "react";
import { NotificationBell } from "@07nghiep/ui/components/notification-bell";
import { trpc } from "../utils/trpc";
import { env } from "@07nghiep/env/employer";

export function NotificationBellContainer() {
  const utils = trpc.useUtils();

  const { data: unreadCount = 0 } = trpc.notification.getUnreadCount.useQuery();
  const { data: notificationsData } = trpc.notification.list.useQuery({ limit: 10 });
  const notifications = notificationsData?.items || [];

  const markAsRead = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      utils.notification.getUnreadCount.invalidate();
      utils.notification.list.invalidate();
    },
  });

  const markAllAsRead = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notification.getUnreadCount.invalidate();
      utils.notification.list.invalidate();
    },
  });

  useEffect(() => {
    // SSE connection
    const eventSource = new EventSource(`${env.VITE_SERVER_URL}/api/notifications/sse`, {
      withCredentials: true,
    });

    eventSource.addEventListener("notification", (event) => {
      utils.notification.getUnreadCount.invalidate();
      utils.notification.list.invalidate();
    });

    return () => {
      eventSource.close();
    };
  }, [utils]);

  return (
    <NotificationBell
      unreadCount={unreadCount}
      notifications={notifications as any}
      onMarkAsRead={(id) => markAsRead.mutate({ id })}
      onMarkAllAsRead={() => markAllAsRead.mutate()}
    />
  );
}
