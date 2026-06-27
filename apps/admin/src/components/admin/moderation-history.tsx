import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistance } from "date-fns";
import { vi } from "date-fns/locale";
import { Ban, Check, Edit, History, Trash2, UserX, XCircle, Eye, type LucideIcon } from "lucide-react";

import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { trpc } from "../../utils/trpc";
import { JobReviewPanel } from "./job-review-panel";

interface ModerationHistoryProps {
  jobId?: string;
  moderatorId?: string;
  limit?: number;
}

type ModerationAction =
  | "APPROVE"
  | "REJECT"
  | "REQUEST_CHANGES"
  | "REMOVE_CONTENT"
  | "WARN_USER"
  | "BAN_USER"
  | "DISMISS_REPORT";

const actionMeta: Record<
  ModerationAction,
  {
    label: string;
    icon: LucideIcon;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  APPROVE: { label: "Phê duyệt", icon: Check, variant: "secondary" },
  REJECT: { label: "Từ chối", icon: XCircle, variant: "destructive" },
  REQUEST_CHANGES: { label: "Yêu cầu chỉnh sửa", icon: Edit, variant: "default" },
  REMOVE_CONTENT: { label: "Gỡ nội dung", icon: Trash2, variant: "destructive" },
  WARN_USER: { label: "Cảnh báo", icon: History, variant: "outline" },
  BAN_USER: { label: "Khóa tài khoản", icon: Ban, variant: "destructive" },
  DISMISS_REPORT: { label: "Bác bỏ", icon: UserX, variant: "outline" },
};

export function ModerationHistory({ jobId, moderatorId, limit = 20 }: ModerationHistoryProps) {
  const [page, setPage] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const { data, isLoading } = useQuery(
    trpc.admin.moderation.getModerationHistory.queryOptions({
      jobId,
      moderatorId,
      page,
      limit,
    })
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <History className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Chưa có lịch sử kiểm duyệt</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Lịch sử kiểm duyệt</h3>

      <div className="space-y-3">
        {data.data.map((item) => {
          const meta = actionMeta[item.action as ModerationAction] ?? {
            label: item.action,
            icon: History,
            variant: "outline" as const,
          };
          const Icon = meta.icon;
          
          const targetJobId = item.job?.id;
          
          return (
            <div
              key={item.id}
              className="rounded-lg border bg-card p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Badge variant={meta.variant} className="flex items-center gap-1">
                    <Icon className="h-4 w-4" />
                    {meta.label}
                  </Badge>

                  <div className="flex-1 space-y-1">
                    {item.job && <p className="font-medium">{item.job.title}</p>}
                    <p className="text-muted-foreground">
                      Bởi {item.moderator.name} ({item.moderator.email})
                    </p>
                    {item.reason && (
                      <p className="text-muted-foreground">
                        <span className="font-medium">Lý do:</span> {item.reason}
                      </p>
                    )}
                    {item.feedback && (
                      <p className="text-muted-foreground">
                        <span className="font-medium">Góp ý:</span> {item.feedback}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistance(new Date(item.createdAt), new Date(), {
                        addSuffix: true,
                        locale: vi,
                      })}
                    </p>
                  </div>
                </div>

                {targetJobId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0"
                    onClick={() => setSelectedJobId(targetJobId)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Xem chi tiết
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page} / {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Sau
          </Button>
        </div>
      )}

      {selectedJobId && (
        <JobReviewPanel
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
          mode="view"
        />
      )}
    </div>
  );
}
