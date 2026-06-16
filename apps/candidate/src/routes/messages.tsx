import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import {
  ConversationList,
  type ConversationItem,
} from "@07nghiep/ui/components/message/conversation-list";
import { useEffect } from "react";
import { env } from "@07nghiep/env/candidate";
import { createSSEConnection } from "@07nghiep/ui/lib/sse";

export const Route = createFileRoute("/messages")({
  component: MessagesLayout,
});

function MessagesLayout() {
  const { data: sessionData } = authClient.useSession();
  const currentUserId = sessionData?.user?.id ?? "";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { conversationId?: string };

  const { data: conversations, isLoading } = useQuery(
    trpc.conversation.list.queryOptions(undefined, {
      enabled: !!currentUserId,
    }),
  );

  useEffect(() => {
    if (!sessionData?.user) {
      navigate({ to: "/login" });
    }
  }, [sessionData, navigate]);

  useEffect(() => {
    if (!env.VITE_SERVER_URL) return;
    const abort = new AbortController();

    createSSEConnection(
      `${env.VITE_SERVER_URL}/api/notifications/sse`,
      (eventType) => {
        if (eventType === "notification") {
          queryClient.invalidateQueries({ queryKey: trpc.conversation.list.queryKey() });
          queryClient.invalidateQueries({ queryKey: trpc.conversation.getUnreadCount.queryKey() });
        }
      },
      abort.signal,
    );

    return () => abort.abort();
  }, [queryClient]);

  const handleSelect = (conversation: ConversationItem) => {
    navigate({
      to: "/messages/$conversationId",
      params: { conversationId: conversation.id },
    });
    queryClient.invalidateQueries({ queryKey: trpc.conversation.list.queryKey() });
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="w-80 shrink-0 border-r bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Tin nhắn</h2>
        </div>
        <ConversationList
          conversations={conversations ?? []}
          currentUserId={currentUserId}
          activeId={params.conversationId}
          isLoading={isLoading}
          onSelect={handleSelect}
        />
      </div>
      <div className="flex flex-1 flex-col bg-background">
        {params.conversationId ? (
          <Outlet />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mb-3 text-5xl">💬</div>
              <h3 className="text-lg font-medium">Tin nhắn của bạn</h3>
              <p className="text-sm text-muted-foreground">Chọn một cuộc trò chuyện để bắt đầu</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
