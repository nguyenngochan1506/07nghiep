import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, FileText, Building2 } from "lucide-react";

import { Badge } from "@07nghiep/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Separator } from "@07nghiep/ui/components/separator";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { Button } from "@07nghiep/ui/components/button";
import {
  Sheet as Dialog,
  SheetTrigger as DialogTrigger,
  SheetContent as DialogContent,
  SheetHeader as DialogHeader,
  SheetTitle as DialogTitle,
  SheetDescription as DialogDescription,
  SheetFooter as DialogFooter,
  SheetClose as DialogClose,
} from "@07nghiep/ui/components/sheet";

import { trpc, queryClient } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import ApplicationStatusTracker from "@/components/application/status-tracker";
import { Label } from "@07nghiep/ui/components/label";
import { Textarea } from "@07nghiep/ui/components/textarea";

export const Route = createFileRoute("/applications/$applicationId")({
  component: ApplicationDetailPage,
});

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
    className: "bg-primary/10 text-primary border-primary/20",
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

function formatDate(dateValue: string | Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function getStatusMeta(status: string) {
  return STATUS_META[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };
}

function ApplicationDetailPage() {
  const { applicationId } = Route.useParams();
  const { data, isLoading } = useQuery(
    trpc.applications.getById.queryOptions({ id: applicationId }),
  );

  const statusMeta = data ? getStatusMeta(data.status) : null;

  const canWithdraw = data && (data.status === "PENDING" || data.status === "VIEWED");

  const withdrawMutation = useMutation(trpc.applications.withdraw.mutationOptions());
  const updateMutation = useMutation(trpc.applications.update.mutationOptions());

  const [isEditingCover, setIsEditingCover] = useState(false);
  const [coverDraft, setCoverDraft] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");

  async function handleWithdraw() {
    if (!data) return;
    try {
      await withdrawMutation.mutateAsync({ id: data.id, reason: withdrawReason || undefined });
      toast.success("Rút đơn thành công");
      // Invalidate current application data
      queryClient.invalidateQueries({ queryKey: trpc.applications.getById.queryOptions({ id: data.id }).queryKey });
      setWithdrawOpen(false);
      setWithdrawReason("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể rút đơn";
      toast.error(message);
    }
  }

  async function handleStartEdit() {
    setCoverDraft(data?.coverLetter ?? "");
    setIsEditingCover(true);
  }

  async function handleCancelEdit() {
    setIsEditingCover(false);
    setCoverDraft("");
  }

  async function handleSaveEdit() {
    if (!data) return;
    try {
      await updateMutation.mutateAsync({ id: data.id, coverLetter: coverDraft });
      toast.success("Cập nhật cover letter thành công");
      // refresh application
      queryClient.invalidateQueries({ queryKey: trpc.applications.getById.queryOptions({ id: data.id }).queryKey });
      setIsEditingCover(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể cập nhật";
      toast.error(message);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          to="/applications"
          className="inline-flex w-fit items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>

        {isLoading ? (
          <Card>
            <CardHeader className="space-y-3 border-b pb-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-3/5" />
              <Skeleton className="h-4 w-1/3" />
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ) : data ? (
          <div className="space-y-6">
            {/* Status tracker (top of detail) */}
            <ApplicationStatusTracker
              currentStatus={data.status}
              lastKnownStep={
                // derive last successful step from histories, find last toStatus that is in our step order
                ((): any => {
                  const STEP_ORDER = ["PENDING", "VIEWED", "SHORTLISTED", "INTERVIEW", "OFFERED"] as const;
                  for (let i = data.histories.length - 1; i >= 0; i--) {
                    const s = data.histories[i].toStatus;
                    if ((STEP_ORDER as readonly string[]).includes(s)) return s;
                  }
                  return undefined;
                })()
              }
            />
            <Card>
              <CardHeader className="border-b pb-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-bold md:text-3xl">
                      {data.job?.title ?? "Không rõ công việc"}
                    </CardTitle>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      {data.job?.organization?.name ?? "Không rõ công ty"}
                    </p>
                  </div>
                  {statusMeta ? <Badge className={statusMeta.className}>{statusMeta.label}</Badge> : null}
                </div>
                </CardHeader>
              {canWithdraw ? (
                <div className="flex items-center justify-end gap-2 p-4">
                  <Button variant="destructive" onClick={() => setWithdrawOpen(true)}>
                    Rút đơn ứng tuyển
                  </Button>

                  <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
                    <DialogContent className="w-full sm:max-w-md">
                      <DialogHeader className="border-b pb-3">
                        <DialogTitle>Rút đơn ứng tuyển</DialogTitle>
                        <DialogDescription>
                          Bạn có muốn rút đơn ứng tuyển này? Lý do rút (không bắt buộc) sẽ được gửi cho nhà tuyển
                          dụng.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="p-4">
                        <Label>Lý do rút đơn (không bắt buộc)</Label>
                        <Textarea
                          value={withdrawReason}
                          onChange={(e) => setWithdrawReason(e.target.value)}
                          className="mt-2 h-28"
                          placeholder="Ví dụ: Đã nhận offer khác, thay đổi kế hoạch cá nhân..."
                        />
                      </div>

                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setWithdrawOpen(false)} className="mr-2">
                          Hủy
                        </Button>
                        <Button onClick={handleWithdraw} className="bg-destructive" disabled={withdrawMutation.isPending}>
                          {withdrawMutation.isPending ? "Đang xử lý..." : "Xác nhận rút"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : null}
              <CardContent className="grid gap-4 pt-4 md:grid-cols-3">
                <div className="rounded-lg border bg-secondary/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Ngày nộp</p>
                  <p className="mt-2 flex items-center gap-2 font-medium">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    {formatDate(data.appliedAt)}
                  </p>
                </div>
                <div className="rounded-lg border bg-secondary/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Cập nhật</p>
                  <p className="mt-2 flex items-center gap-2 font-medium">
                    <Clock3 className="h-4 w-4 text-primary" />
                    {formatDate(data.updatedAt)}
                  </p>
                </div>
                <div className="rounded-lg border bg-secondary/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Hồ sơ đính kèm</p>
                  <p className="mt-2 flex items-center gap-2 font-medium">
                    <FileText className="h-4 w-4 text-primary" />
                    {data.resumeUrl ? (
                      <a
                        href={data.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Mở CV
                      </a>
                    ) : (
                      "Chưa có"
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b pb-4 flex items-center justify-between">
                <CardTitle className="text-lg">Cover Letter</CardTitle>
                {data.status === "PENDING" ? (
                  <div>
                    {!isEditingCover ? (
                      <Button size="sm" onClick={handleStartEdit}>
                        Sửa thư giới thiệu
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="pt-4">
                {!isEditingCover ? (
                  <p className="whitespace-pre-line text-sm leading-6 text-foreground">
                    {data.coverLetter ?? "Chưa có cover letter."}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div>
                      <Label>Chỉnh sửa thư giới thiệu</Label>
                      <Textarea
                        value={coverDraft}
                        onChange={(e) => setCoverDraft(e.target.value)}
                        className="mt-2 h-40"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                        Lưu
                      </Button>
                      <Button variant="ghost" onClick={handleCancelEdit}>
                        Hủy
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator className="my-4" />

            {data.histories.length > 0 ? (
              <Card>
                <CardHeader className="border-b pb-4">
                  <CardTitle className="text-lg">Lịch sử trạng thái</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {data.histories.map((history) => (
                    <div key={history.id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium">
                            {history.fromStatus ?? "Khởi tạo"} → {history.toStatus}
                          </p>
                          {history.note ? (
                            <p className="mt-1 text-sm text-muted-foreground">{history.note}</p>
                          ) : null}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(history.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
            <Separator className="my-4" />

            {/* Employer notes */}
            {data.notes ? (
              <Card>
                <CardHeader className="border-b pb-4">
                  <CardTitle className="text-lg">Ghi chú từ nhà tuyển dụng</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="whitespace-pre-line text-sm leading-6 text-foreground">{data.notes}</p>
                </CardContent>
              </Card>
            ) : null}

            <Separator className="my-4" />

            {/* Chat placeholder */}
            <Card>
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg">Trò chuyện</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-col gap-3">
                  <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">Chức năng nhắn tin sẽ được triển khai sau. Đây là khung thử nghiệm.</div>
                  <div className="flex items-center gap-2">
                    <input className="flex-1 rounded-md border px-3 py-2" placeholder="Gửi tin nhắn (chưa khả dụng)" disabled />
                    <Button disabled>Gửi</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
