import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MessageBubble, type MessageData } from "./message-bubble";
import { Loader2, ChevronDown } from "lucide-react";
import { Button } from "../button";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(messages.length);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = (smooth = true) => {
    requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      if (smooth) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      } else {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  useLayoutEffect(() => {
    if (prevLengthRef.current === 0 && messages.length > 0) {
      scrollToBottom(false);
    } else if (messages.length > prevLengthRef.current && !isLoadingMore) {
      scrollToBottom(true);
    }
    prevLengthRef.current = messages.length;
  }, [messages.length, isLoadingMore]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

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
    <div className="relative flex min-h-0 flex-1">
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto">
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
        </div>
      </div>
      {showScrollButton && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-3 right-3 z-10 h-8 w-8 rounded-full shadow-md"
          onClick={() => scrollToBottom(true)}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
