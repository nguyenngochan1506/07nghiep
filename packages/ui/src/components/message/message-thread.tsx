import { useEffect, useRef } from "react";
import { MessageBubble, type MessageData } from "./message-bubble";
import { ScrollArea } from "../scroll-area";
import { Loader2 } from "lucide-react";

interface MessageThreadProps {
  messages: MessageData[];
  currentUserId: string;
  isLoading?: boolean;
  isLoadingMore?: boolean;
}

export function MessageThread({
  messages,
  currentUserId,
  isLoading,
  isLoadingMore,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <div className="mb-2 text-4xl">💬</div>
          <p className="text-sm text-muted-foreground">Chưa có tin nhắn nào</p>
          <p className="text-xs text-muted-foreground">
            Gửi tin nhắn đầu tiên để bắt đầu trò chuyện
          </p>
        </div>
      </div>
    );
  }

  const shouldShowAvatar = (index: number) => {
    if (index === messages.length - 1) return true;
    return messages[index + 1]?.senderId !== messages[index]?.senderId;
  };

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-2 p-4">
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === currentUserId}
            showAvatar={shouldShowAvatar(i)}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
