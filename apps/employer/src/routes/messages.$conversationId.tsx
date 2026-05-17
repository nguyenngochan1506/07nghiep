import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import { MessageThread } from "@07nghiep/ui/components/message/message-thread";
import { MessageInput } from "@07nghiep/ui/components/message/message-input";
import { Avatar, AvatarFallback, AvatarImage } from "@07nghiep/ui/components/avatar";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { useEffect, useRef } from "react";
import { env } from "@07nghiep/env/employer";

export const Route = createFileRoute("/messages/$conversationId")({
  component: ConversationDetail,
});

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function ConversationDetail() {
  const { conversationId } = Route.useParams();
  const { data: sessionData } = authClient.useSession();
  const currentUserId = sessionData?.user?.id ?? "";
  const queryClient = useQueryClient();
  const markAsReadCalled = useRef(false);

  const { data: conversation, isLoading: convLoading } = useQuery(
    trpc.conversation.getById.queryOptions({ id: conversationId }, {
      enabled: !!conversationId,
    })
  );

  const { data: messagesData, isLoading: msgLoading } = useQuery(
    trpc.message.list.queryOptions({ conversationId, limit: 50 }, {
      enabled: !!conversationId,
    })
  );

  const markAsRead = useMutation(
    trpc.conversation.markAsRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.conversation.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.conversation.getUnreadCount.queryKey() });
      },
    })
  );

  const sendMessage = useMutation(
    trpc.message.send.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.message.list.queryKey({ conversationId }) });
        queryClient.invalidateQueries({ queryKey: trpc.conversation.list.queryKey() });
      },
    })
  );

  useEffect(() => {
    if (conversationId && !markAsReadCalled.current) {
      markAsReadCalled.current = true;
      markAsRead.mutate({ id: conversationId });
    }
  }, [conversationId]);

  useEffect(() => {
    markAsReadCalled.current = false;
  }, [conversationId]);

  useEffect(() => {
    if (!env.VITE_SERVER_URL) return;
    const eventSource = new EventSource(
      `${env.VITE_SERVER_URL}/api/messages/sse?conversation=${conversationId}`
    );

    eventSource.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.senderId !== currentUserId) {
          markAsRead.mutate({ id: conversationId });
        }
        queryClient.invalidateQueries({ queryKey: trpc.message.list.queryKey({ conversationId }) });
        queryClient.invalidateQueries({ queryKey: trpc.conversation.list.queryKey() });
      } catch {}
    });

    return () => eventSource.close();
  }, [conversationId, currentUserId, queryClient, markAsRead]);

  const otherUser =
    conversation?.employer.id === currentUserId
      ? conversation?.candidate
      : conversation?.employer;

  return (
    <div className="flex h-full flex-col">
      {convLoading ? (
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-1 h-3 w-24" />
          </div>
        </div>
      ) : otherUser ? (
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={otherUser.image ?? undefined} alt={otherUser.name ?? ""} />
            <AvatarFallback>{getInitials(otherUser.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{otherUser.name || "Người dùng"}</p>
            {conversation?.job && (
              <p className="text-xs text-muted-foreground">
                {conversation.job.title}
              </p>
            )}
          </div>
        </div>
      ) : null}

      <MessageThread
        messages={messagesData?.items ?? []}
        currentUserId={currentUserId}
        isLoading={msgLoading}
      />

      <MessageInput
        onSend={(content) => {
          sendMessage.mutate({ conversationId, content });
        }}
        disabled={sendMessage.isPending}
      />
    </div>
  );
}
