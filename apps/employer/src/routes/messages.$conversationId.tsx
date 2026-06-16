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
import type { MessageData } from "@07nghiep/ui/components/message/message-bubble";
import { createSSEConnection } from "@07nghiep/ui/lib/sse";

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

function getAvatarUrl(
  user: { image: string | null; profile: { avatarUrl: string | null } | null } | undefined,
) {
  if (!user) return undefined;
  return user.profile?.avatarUrl || user.image || undefined;
}

function ConversationDetail() {
  const { conversationId } = Route.useParams();
  const { data: sessionData } = authClient.useSession();
  const currentUserId = sessionData?.user?.id ?? "";
  const currentUserName = sessionData?.user?.name ?? null;
  const queryClient = useQueryClient();
  const markAsReadCalled = useRef(false);

  const messagesQueryKey = trpc.message.list.queryKey({ conversationId });

  const { data: conversation, isLoading: convLoading } = useQuery(
    trpc.conversation.getById.queryOptions(
      { id: conversationId },
      {
        enabled: !!conversationId,
      },
    ),
  );

  const { data: messagesData, isLoading: msgLoading } = useQuery(
    trpc.message.list.queryOptions(
      { conversationId, limit: 50 },
      {
        enabled: !!conversationId,
      },
    ),
  );

  const markAsRead = useMutation(
    trpc.conversation.markAsRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.conversation.getApplicants.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.conversation.getUnreadCount.queryKey() });
      },
    }),
  );

  const sendMessage = useMutation(
    trpc.message.send.mutationOptions({
      onMutate: async (newMsg) => {
        await queryClient.cancelQueries({ queryKey: messagesQueryKey });
        const previous = queryClient.getQueryData(messagesQueryKey);

        const optimisticMsg: MessageData = {
          id: `temp-${Date.now()}`,
          content: newMsg.content,
          senderId: currentUserId,
          read: false,
          createdAt: new Date().toISOString(),
          sender: {
            id: currentUserId,
            name: currentUserName,
            image: null,
            profile: null,
          },
        };

        queryClient.setQueryData(messagesQueryKey, (old: any) => {
          if (!old) return { items: [optimisticMsg], nextCursor: null };
          return { ...old, items: [...old.items, optimisticMsg] };
        });

        return { previous };
      },
      onError: (_err, _msg, context) => {
        if (context?.previous) {
          queryClient.setQueryData(messagesQueryKey, context.previous);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: messagesQueryKey });
        queryClient.invalidateQueries({ queryKey: trpc.conversation.getApplicants.queryKey() });
      },
    }),
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
    const abort = new AbortController();

    createSSEConnection(
      `${env.VITE_SERVER_URL}/api/messages/sse?conversation=${conversationId}`,
      (eventType, data) => {
        try {
          const msg = JSON.parse(data);
          if (eventType === "message") {
            if (msg.senderId !== currentUserId) {
              markAsRead.mutate({ id: conversationId });
            }
            queryClient.invalidateQueries({ queryKey: messagesQueryKey });
            queryClient.invalidateQueries({ queryKey: trpc.conversation.getApplicants.queryKey() });
            queryClient.invalidateQueries({
              queryKey: trpc.conversation.getUnreadCount.queryKey(),
            });
          }
        } catch {}
      },
      abort.signal,
    );

    return () => abort.abort();
  }, [conversationId, currentUserId, queryClient, markAsRead, messagesQueryKey]);

  const otherUser =
    conversation?.employer?.id === currentUserId ? conversation?.candidate : conversation?.employer;

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
            <AvatarImage src={getAvatarUrl(otherUser)} alt={otherUser.name ?? ""} />
            <AvatarFallback>{getInitials(otherUser.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{otherUser.name || "Người dùng"}</p>
            {conversation?.job && (
              <p className="text-xs text-muted-foreground">{conversation.job.title}</p>
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
      />
    </div>
  );
}
