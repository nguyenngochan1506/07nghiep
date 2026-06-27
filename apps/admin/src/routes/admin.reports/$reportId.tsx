import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, XCircle, Trash2, AlertOctagon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { Separator } from "@07nghiep/ui/components/separator";
import { Textarea } from "@07nghiep/ui/components/textarea";
import { Label } from "@07nghiep/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@07nghiep/ui/components/dialog";

import { trpc } from "../../utils/trpc";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/admin/reports/$reportId")({
  component: ReportDetailPage,
});

const reportTypeLabels: Record<string, string> = {
  INAPPROPRIATE_CONTENT: "Nội dung không phù hợp",
  SPAM: "Spam",
  SCAM_FRAUD: "Lừa đảo",
  DUPLICATE_POSTING: "Đăng trùng",
  OTHER: "Khác",
};

const contentTypeLabels: Record<string, string> = {
  JOB: "Việc làm",
  USER: "Người dùng",
  MESSAGE: "Tin nhắn",
};

const statusLabels: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  PENDING: { label: "Chờ xử lý", variant: "destructive" },
  RESOLVED: { label: "Đã xử lý", variant: "default" },
  DISMISSED: { label: "Đã bác bỏ", variant: "secondary" },
};

function ReportDetailPage() {
  const { reportId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionDialog, setActionDialog] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const reportQuery = useQuery(
    trpc.admin.moderation.getReport.queryOptions({ id: reportId })
  );

  const resolveReportMutation = useMutation(
    trpc.admin.moderation.resolveReport.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.moderation.getReport.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.admin.moderation.listReports.queryKey() });
        toast.success("Báo cáo đã được xử lý");
        setActionDialog(null);
        setNotes("");
      },
      onError: (error: any) => {
        toast.error(error.message || "Có lỗi xảy ra");
      },
    })
  );

  const report = reportQuery.data;

  if (reportQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Không tìm thấy báo cáo</p>
          <Button onClick={() => navigate({ to: "/admin/reports" })}>
            Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  const handleAction = (action: string) => {
    resolveReportMutation.mutate({
      id: reportId,
      // biome-ignore lint/suspicious/noExplicitAny: action comes from string state
      action: action as any,
      notes: notes || undefined,
    });
  };

  const isPending = report.status === "PENDING";

  // Cast content to specific types based on contentType to avoid union type TS errors
  // biome-ignore lint/suspicious/noExplicitAny: complex conditional union
  const jobContent = report.contentType === "JOB" ? (report.content as any) : null;
  // biome-ignore lint/suspicious/noExplicitAny: complex conditional union
  const userContent = report.contentType === "USER" ? (report.content as any) : null;
  // biome-ignore lint/suspicious/noExplicitAny: complex conditional union
  const messageContent = report.contentType === "MESSAGE" ? (report.content as any) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/admin/reports" })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <h1 className="text-3xl font-bold">Chi tiết báo cáo</h1>
        </div>
        <Badge variant={statusLabels[report.status]?.variant || "default"}>
          {statusLabels[report.status]?.label || report.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report info */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin báo cáo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Loại nội dung</p>
                  <Badge variant="outline">
                    {contentTypeLabels[report.contentType] || report.contentType}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Loại vi phạm</p>
                  <Badge variant="outline">
                    {reportTypeLabels[report.reportType] || report.reportType}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">Người báo cáo</p>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                    {report.reporter?.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-medium">{report.reporter?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{report.reporter?.email}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">Mô tả vi phạm</p>
                <p className="text-sm">
                  {report.description || <em className="text-muted-foreground">Không có mô tả</em>}
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Ngày báo cáo</p>
                  <p className="font-medium">{new Date(report.createdAt).toLocaleString("vi-VN")}</p>
                </div>
                {report.resolvedAt && (
                  <div>
                    <p className="text-muted-foreground">Ngày xử lý</p>
                    <p className="font-medium">{new Date(report.resolvedAt).toLocaleString("vi-VN")}</p>
                  </div>
                )}
              </div>

              {report.resolution && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Kết quả xử lý</p>
                    <p className="text-sm">{report.resolution}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Content details */}
          <Card>
            <CardHeader>
              <CardTitle>Nội dung bị báo cáo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.contentType === "JOB" && jobContent && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Tiêu đề công việc</p>
                    <p className="font-semibold text-lg">{jobContent.title}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Công ty</p>
                      <p className="text-sm font-medium">{jobContent.organization?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Trạng thái</p>
                      <Badge>{jobContent.status}</Badge>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Người đăng</p>
                    <div className="text-sm">
                      <p className="font-medium">{jobContent.organization?.user?.name}</p>
                      <p className="text-muted-foreground">{jobContent.organization?.user?.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {report.contentType === "USER" && userContent && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Tên người dùng</p>
                    <p className="font-semibold text-lg">{userContent.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm">{userContent.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Vai trò</p>
                      <Badge>{userContent.role}</Badge>
                    </div>
                  </div>
                </div>
              )}

              {report.contentType === "MESSAGE" && messageContent && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Nội dung tin nhắn</p>
                    <div className="rounded-md bg-muted p-3 text-sm">
                      {messageContent.content}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Người gửi</p>
                    <p className="text-sm font-medium">{messageContent.sender?.name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hành động</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isPending ? (
                <>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => setActionDialog("DISMISS_REPORT")}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Bác bỏ báo cáo
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => setActionDialog("WARN_USER")}
                  >
                    <AlertOctagon className="h-4 w-4 mr-2" />
                    Cảnh báo người vi phạm
                  </Button>
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={() => setActionDialog("REMOVE_CONTENT")}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Xóa nội dung
                  </Button>
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={() => setActionDialog("BAN_USER")}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Khóa tài khoản
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Báo cáo đã được xử lý
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action confirmation dialog */}
      <Dialog open={actionDialog !== null} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Xác nhận hành động</DialogTitle>
            <DialogDescription>
              {actionDialog === "DISMISS_REPORT" && "Bác bỏ báo cáo này? Báo cáo sẽ được đánh dấu là đã bác bỏ."}
              {actionDialog === "WARN_USER" && "Gửi cảnh báo cho người vi phạm? Họ sẽ nhận được thông báo cảnh báo."}
              {actionDialog === "REMOVE_CONTENT" && "Xóa nội dung bị báo cáo? Hành động này không thể hoàn tác."}
              {actionDialog === "BAN_USER" && "Khóa tài khoản người vi phạm? Họ sẽ không thể đăng nhập."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Ghi chú (tùy chọn)</Label>
              <Textarea
                id="notes"
                placeholder="Nhập ghi chú về quyết định của bạn..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none mt-2"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setActionDialog(null)}
                disabled={resolveReportMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                className="flex-1"
                onClick={() => actionDialog && handleAction(actionDialog)}
                disabled={resolveReportMutation.isPending}
              >
                {resolveReportMutation.isPending ? "Đang xử lý..." : "Xác nhận"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
