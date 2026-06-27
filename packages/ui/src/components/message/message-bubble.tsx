import { Check, CheckCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar";

export interface MessageData {
  id: string;
  content: string;
  senderId: string;
  read: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
    profile: { avatarUrl: string | null } | null;
  };
}

interface MessageBubbleProps {
  message: MessageData;
  isOwn: boolean;
  showAvatar?: boolean;
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarUrl(sender: MessageData["sender"]) {
  return sender.profile?.avatarUrl || sender.image || undefined;
}

export function MessageBubble({ message, isOwn, showAvatar = true }: MessageBubbleProps) {
  return (
    <div className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {showAvatar && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={getAvatarUrl(message.sender)} alt={message.sender.name ?? ""} />
          <AvatarFallback className="text-xs">{getInitials(message.sender.name)}</AvatarFallback>
        </Avatar>
      )}
      {!showAvatar && <div className="w-8 shrink-0" />}
      <div
        className={`group flex max-w-[75%] flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}
      >
        {!isOwn && message.sender.name && (
          <span className="text-xs font-medium text-muted-foreground">{message.sender.name}</span>
        )}
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm ${
            isOwn ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <div
          className={`flex items-center gap-1 text-[10px] text-muted-foreground ${
            isOwn ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isOwn &&
            (message.read ? (
              <CheckCheck className="h-3 w-3 text-primary" />
            ) : (
              <Check className="h-3 w-3" />
            ))}
        </div>
      </div>
    </div>
  );
}
