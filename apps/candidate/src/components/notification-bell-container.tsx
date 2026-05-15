import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NotificationBell } from "@07nghiep/ui/components/notification-bell";
import { trpc } from "../utils/trpc";
import { env } from "@07nghiep/env/candidate";

export function NotificationBellContainer() {
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery(trpc.notification.getUnreadCount.queryOptions());
  const { data: notificationsData } = useQuery(trpc.notification.list.queryOptions({ limit: 10 }));
  const notifications = notificationsData?.items || [];

  const markAsRead = useMutation(trpc.notification.markAsRead.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.notification.getUnreadCount.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.notification.list.queryKey() });
    },
  }));

  const markAllAsRead = useMutation(trpc.notification.markAllAsRead.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.notification.getUnreadCount.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.notification.list.queryKey() });
    },
  }));

  useEffect(() => {
    // SSE connection
    const eventSource = new EventSource(`${env.VITE_SERVER_URL}/api/notifications/sse`, {
      withCredentials: true,
    });

    eventSource.addEventListener("notification", (event) => {
      queryClient.invalidateQueries({ queryKey: trpc.notification.getUnreadCount.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.notification.list.queryKey() });
    });

    return () => {
      eventSource.close();
    };
  }, [queryClient]);

  return (
    <NotificationBell
      unreadCount={unreadCount}
      notifications={notifications as any}
      onMarkAsRead={(id) => markAsRead.mutate({ id })}
      onMarkAllAsRead={() => markAllAsRead.mutate()}
    />
  );
}
