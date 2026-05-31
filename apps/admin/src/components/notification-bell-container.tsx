import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NotificationBell } from "@07nghiep/ui/components/notification-bell";
import { trpc } from "../utils/trpc";
import { env } from "@07nghiep/env/admin";

function createSSEConnection(
  url: string,
  onEvent: (event: string, data: string) => void,
  signal: AbortSignal
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
  const abortRef = useRef<AbortController | null>(null);

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
      abort.signal
    );

    return () => {
      abort.abort();
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
