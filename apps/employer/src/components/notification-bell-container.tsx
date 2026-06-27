import { useEffect, useRef } from "react";
import type { ComponentProps } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { NotificationBell } from "@07nghiep/ui/components/notification-bell";
import type { NotificationItem } from "@07nghiep/ui/components/notification-bell";
import { trpc } from "../utils/trpc";
import { env } from "@07nghiep/env/employer";

type NotificationBellNotifications = ComponentProps<typeof NotificationBell>["notifications"];

function createSSEConnection(
  url: string,
  onEvent: (event: string, data: string) => void,
  signal: AbortSignal,
) {
  fetch(url, {
    headers: { Accept: "text/event-stream" },
    credentials: "include",
    signal,
  })
    .then(async (response) => {
      if (!response.ok || !response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let eventType = "";
        let data = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            data = line.slice(6);
          } else if (line === "" && eventType) {
            onEvent(eventType, data);
            eventType = "";
            data = "";
          }
        }
      }
    })
    .catch(() => {});
}

export function NotificationBellContainer() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const abortRef = useRef<AbortController | null>(null);

  const { data: unreadCount = 0 } = useQuery(trpc.notification.getUnreadCount.queryOptions());
  const { data: notificationsData } = useQuery(trpc.notification.list.queryOptions({ limit: 10 }));
  const notifications: NotificationBellNotifications =
    notificationsData?.items.map((notification) => ({
      ...notification,
      createdAt: notification.createdAt,
    })) || [];

  const markAsRead = useMutation(
    trpc.notification.markAsRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.notification.getUnreadCount.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.notification.list.queryKey() });
      },
    }),
  );

  const markAllAsRead = useMutation(
    trpc.notification.markAllAsRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.notification.getUnreadCount.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.notification.list.queryKey() });
      },
    }),
  );

  useEffect(() => {
    const abort = new AbortController();
    abortRef.current = abort;

    createSSEConnection(
      `${env.VITE_SERVER_URL}/api/notifications/sse`,
      (event, _data) => {
        if (event === "notification") {
          queryClient.invalidateQueries({ queryKey: trpc.notification.getUnreadCount.queryKey() });
          queryClient.invalidateQueries({ queryKey: trpc.notification.list.queryKey() });
        }
      },
      abort.signal,
    );

    return () => {
      abort.abort();
    };
  }, [queryClient]);

  const handleNotificationClick = (notification: NotificationItem) => {
    console.log("Notification clicked:", notification);
    console.log("Notification data:", notification.data);
    console.log("Notification data type:", typeof notification.data);
    
    // Parse notification data
    // Prisma Json field might be returned as object or string
    let data: any;
    if (typeof notification.data === "string") {
      try {
        data = JSON.parse(notification.data);
      } catch {
        data = {};
      }
    } else {
      data = notification.data || {};
    }
    
    console.log("Parsed data:", data);
    
    if (data?.jobId) {
      console.log("Navigating to job:", data.jobId);
      // Navigate to job edit page
      navigate({ to: `/my-jobs/$jobId/edit`, params: { jobId: data.jobId } });
    } else {
      console.log("No jobId found in notification data");
    }
  };

  return (
    <NotificationBell
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkAsRead={(id) => markAsRead.mutate({ id })}
      onMarkAllAsRead={() => markAllAsRead.mutate()}
      onNotificationClick={handleNotificationClick}
    />
  );
}
