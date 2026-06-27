import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, XCircle, Edit } from "lucide-react";

import { Button } from "@07nghiep/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@07nghiep/ui/components/dialog";
import { Textarea } from "@07nghiep/ui/components/textarea";
import { Label } from "@07nghiep/ui/components/label";
import { trpc } from "../../utils/trpc";

interface JobModerationActionsProps {
  jobId: string;
  action: "approve" | "reject" | "request-changes";
  onClose: () => void;
  onComplete: () => void;
}

export function JobModerationActions({
  jobId,
  action,
  onClose,
  onComplete,
}: JobModerationActionsProps) {
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const approveMutation = useMutation(trpc.admin.moderation.approveJob.mutationOptions());
  const rejectMutation = useMutation(trpc.admin.moderation.rejectJob.mutationOptions());
  const requestChangesMutation = useMutation(trpc.admin.moderation.requestChanges.mutationOptions());

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      if (action === "approve") {
        await approveMutation.mutateAsync({ jobId });
      } else if (action === "reject") {
        if (!reason.trim()) {
          alert("Vui lòng nhập lý do từ chối");
          setIsSubmitting(false);
          return;
        }
        await rejectMutation.mutateAsync({ jobId, reason });
      } else if (action === "request-changes") {
        if (!feedback.trim()) {
          alert("Vui lòng nhập góp ý chỉnh sửa");
          setIsSubmitting(false);
          return;
        }
        await requestChangesMutation.mutateAsync({ jobId, feedback });
      }

      onComplete();
    } catch (error) {
      console.error("Moderation action failed:", error);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDialogContent = () => {
    switch (action) {
      case "approve":
        return {
          icon: <Check className="h-6 w-6 text-success" />,
          title: "Phê duyệt tin tuyển dụng",
          description:
            "Tin tuyển dụng sẽ được công khai và hiển thị cho ứng viên. Nhà tuyển dụng sẽ nhận được thông báo.",
          showInput: false,
        };
      case "reject":
        return {
          icon: <XCircle className="h-6 w-6 text-destructive" />,
          title: "Từ chối tin tuyển dụng",
          description:
            "Tin tuyển dụng sẽ bị từ chối và quay về trạng thái nháp. Nhà tuyển dụng sẽ nhận được thông báo kèm lý do.",
          showInput: true,
          inputLabel: "Lý do từ chối",
          inputPlaceholder: "Nhập lý do từ chối tin tuyển dụng...",
          inputValue: reason,
          onInputChange: setReason,
        };
      case "request-changes":
        return {
          icon: <Edit className="h-6 w-6 text-warning" />,
          title: "Yêu cầu chỉnh sửa",
          description:
            "Tin tuyển dụng sẽ được trả về cho nhà tuyển dụng để chỉnh sửa. Họ sẽ nhận được thông báo kèm góp ý của bạn.",
          showInput: true,
          inputLabel: "Góp ý chỉnh sửa",
          inputPlaceholder: "Nhập góp ý về những điểm cần chỉnh sửa...",
          inputValue: feedback,
          onInputChange: setFeedback,
        };
    }
  };

  const content = getDialogContent();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex justify-center">{content.icon}</div>
          <DialogTitle className="text-center">{content.title}</DialogTitle>
          <DialogDescription className="text-center">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {content.showInput && (
            <div className="space-y-2">
              <Label htmlFor="input">{content.inputLabel}</Label>
              <Textarea
                id="input"
                placeholder={content.inputPlaceholder}
                value={content.inputValue}
                onChange={(e) => content.onInputChange?.(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={isSubmitting}
              variant={action === "approve" ? "default" : "destructive"}
            >
              {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
