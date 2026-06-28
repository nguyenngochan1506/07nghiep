import { Avatar, AvatarFallback, AvatarImage } from "@07nghiep/ui/components/avatar";
import { Badge } from "@07nghiep/ui/components/badge";
import { ScrollArea } from "@07nghiep/ui/components/scroll-area";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { MessageSquare, Search } from "lucide-react";
import { Input } from "@07nghiep/ui/components/input";
import { useState } from "react";

type CandidateInfo = {
  id: string;
  name: string | null;
  image: string | null;
  profile: { avatarUrl: string | null } | null;
};

export interface ApplicantItem {
  id: string;
  candidate: CandidateInfo;
  job: { id: string; title: string };
  applicationId: string;
  applicationStatus: string;
  appliedAt: string;
  conversationId: string | null;
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    read: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
}

interface ApplicantListProps {
  applicants: ApplicantItem[];
  activeConversationId?: string;
  isLoading?: boolean;
  onSelect: (applicant: ApplicantItem) => void;
  onSearch?: (query: string) => void;
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

function getAvatarUrl(candidate: CandidateInfo) {
  return candidate.profile?.avatarUrl || candidate.image || undefined;
}

const statusLabels: Record<string, string> = {
  PENDING: "Chờ xem",
  VIEWED: "Đã xem",
  SHORTLISTED: "Tiềm năng",
  INTERVIEWING: "Phỏng vấn",
  OFFERED: "Đã gửi đề nghị",
  REJECTED: "Từ chối",
  WITHDRAWN: "Rút lui",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  PENDING: "secondary",
  VIEWED: "outline",
  SHORTLISTED: "default",
  INTERVIEWING: "default",
  OFFERED: "default",
  REJECTED: "outline",
  WITHDRAWN: "secondary",
};

export function ApplicantList({
  applicants,
  activeConversationId,
  isLoading,
  onSelect,
  onSearch,
}: ApplicantListProps) {
  const [search, setSearch] = useState("");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {onSearch && (
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm ứng viên..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                onSearch(e.target.value);
              }}
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
      )}
      <ScrollArea className="flex-1">
        {applicants.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Chưa có ứng viên nào</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ứng viên sẽ xuất hiện tại đây sau khi ứng tuyển
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {applicants.map((applicant) => {
              const isActive = applicant.conversationId === activeConversationId;

              return (
                <button
                  type="button"
                  key={applicant.id}
                  onClick={() => onSelect(applicant)}
                  className={`flex items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 ${
                    isActive ? "bg-muted" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={getAvatarUrl(applicant.candidate)}
                        alt={applicant.candidate.name ?? ""}
                      />
                      <AvatarFallback>{getInitials(applicant.candidate.name)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {applicant.candidate.name || "Ứng viên"}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {getRelativeTime(applicant.appliedAt)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{applicant.job.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge
                        variant={statusVariant[applicant.applicationStatus] ?? "secondary"}
                        className="h-4 px-1.5 text-[10px]"
                      >
                        {statusLabels[applicant.applicationStatus] ?? applicant.applicationStatus}
                      </Badge>
                      {applicant.lastMessage && (
                        <span className="truncate text-[11px] text-muted-foreground">
                          {applicant.lastMessage.content.slice(0, 30)}
                          {applicant.lastMessage.content.length > 30 ? "..." : ""}
                        </span>
                      )}
                      {applicant.unreadCount > 0 && (
                        <Badge
                          variant="default"
                          className="ml-auto h-4 min-w-4 shrink-0 rounded-full px-1 text-[10px]"
                        >
                          {applicant.unreadCount > 99 ? "99+" : applicant.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
