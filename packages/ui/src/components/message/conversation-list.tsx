import { Avatar, AvatarFallback, AvatarImage } from "../avatar";
import { Badge } from "../badge";
import { ScrollArea } from "../scroll-area";
import { Skeleton } from "../skeleton";
import { MessageSquare } from "lucide-react";

type UserInfo = {
  id: string;
  name: string | null;
  image: string | null;
  profile: { avatarUrl: string | null } | null;
};

export interface ConversationItem {
  id: string;
  jobId: string | null;
  job: { id: string; title: string } | null;
  employer: UserInfo;
  candidate: UserInfo;
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    read: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
  lastMessageAt: string;
  createdAt: string;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  currentUserId: string;
  activeId?: string;
  isLoading?: boolean;
  onSelect: (conversation: ConversationItem) => void;
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

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} ngày`;
  return date.toLocaleDateString("vi-VN");
}

function getAvatarUrl(user: UserInfo) {
  return user.profile?.avatarUrl || user.image || undefined;
}

export function ConversationList({
  conversations,
  currentUserId,
  activeId,
  isLoading,
  onSelect,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Chưa có cuộc trò chuyện nào</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col">
        {conversations.map((conv) => {
          const otherUser =
            conv.employer.id === currentUserId ? conv.candidate : conv.employer;
          const isActive = conv.id === activeId;

          return (
            <button
              type="button"
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`flex items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 ${
                isActive ? "bg-muted" : ""
              }`}
            >
              <div className="relative shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getAvatarUrl(otherUser)} alt={otherUser.name ?? ""} />
                  <AvatarFallback>{getInitials(otherUser.name)}</AvatarFallback>
                </Avatar>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {otherUser.name || "Người dùng"}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {getRelativeTime(conv.lastMessageAt)}
                  </span>
                </div>
                {conv.job && (
                  <p className="truncate text-xs text-muted-foreground">
                    {conv.job.title}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs text-muted-foreground">
                    {conv.lastMessage
                      ? conv.lastMessage.content
                      : "Chưa có tin nhắn"}
                  </p>
                  {conv.unreadCount > 0 && (
                    <Badge variant="default" className="h-4 min-w-4 shrink-0 rounded-full px-1 text-[10px]">
                      {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
