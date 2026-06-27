import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, CalendarDays, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@07nghiep/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@07nghiep/ui/components/card";
import { Button } from "@07nghiep/ui/components/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@07nghiep/ui/components/alert-dialog";

import { trpc, queryClient } from "@/utils/trpc";

const STATUS_META: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  PENDING: {
    label: "Chờ duyệt",
    className: "bg-muted text-muted-foreground border-border",
  },
  VIEWED: {
    label: "Đã xem",
    className: "bg-brand-cyan/10 text-primary border-brand-cyan/30",
  },
  SHORTLISTED: {
    label: "Vào shortlist",
    className: "bg-success/10 text-success border-success/20",
  },
  INTERVIEW: {
    label: "Phỏng vấn",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  OFFERED: {
    label: "Đề nghị",
    className: "bg-success/10 text-success border-success/20",
  },
  REJECTED: {
    label: "Từ chối",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  WITHDRAWN: {
    label: "Đã rút",
    className: "bg-muted text-muted-foreground border-border",
  },
};

function formatApplicationDate(dateValue: string | Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateValue));
}

function getStatusMeta(status: string) {
  return (
    STATUS_META[status] ?? {
      label: status,
      className: "bg-muted text-muted-foreground border-border",
    }
  );
}

export type ApplicationCardProps = {
  id: string;
  status: string;
  appliedAt: string | Date;
  job: {
    id: string;
    title: string;
    organization: {
      name: string;
    } | null;
  } | null;
};

export function ApplicationCard({ id, status, appliedAt, job }: ApplicationCardProps) {
  const statusMeta = getStatusMeta(status);
  const canWithdraw = status === "PENDING" || status === "VIEWED";

  const withdrawMutation = useMutation(trpc.applications.withdraw.mutationOptions());

  async function handleWithdraw() {
    try {
      await withdrawMutation.mutateAsync({ id });
      toast.success("Rút đơn thành công");
      // Invalidate applications list
      queryClient.invalidateQueries({ queryKey: trpc.applications.list.queryOptions().queryKey });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể rút đơn";
      toast.error(message);
    }
  }

  return (
    <Card className="h-full border-border/70 bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <CardHeader className="space-y-3 border-b pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="line-clamp-2 text-base font-semibold md:text-lg">
              {job?.title ?? "Không rõ công việc"}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{job?.organization?.name ?? "Không rõ công ty"}</span>
            </CardDescription>
          </div>
          <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>Nộp ngày {formatApplicationDate(appliedAt)}</span>
        </div>

        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between gap-2">
            {job?.id ? (
              <Link
                to="/jobs/$jobId"
                params={{ jobId: job.id }}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Xem việc
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground">Không có công việc</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            {canWithdraw ? (
              <AlertDialog>
                <AlertDialogTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={withdrawMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Rút đơn</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận rút đơn ứng tuyển</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn có chắc chắn muốn rút đơn ứng tuyển cho vị trí{" "}
                      <strong>{job?.title}</strong> không? Hành động này không thể hoàn tác.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleWithdraw}
                      disabled={withdrawMutation.isPending}
                    >
                      {withdrawMutation.isPending ? "Đang xử lý..." : "Xác nhận rút đơn"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <span className="text-xs text-muted-foreground">
                Chỉ có thể rút đơn ở trạng thái Chờ duyệt hoặc Đã xem
              </span>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              disabled
              title="Tính năng tin nhắn sẽ sớm được kích hoạt"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Tin nhắn</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
