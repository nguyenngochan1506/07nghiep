import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Flag } from "lucide-react";

import { Button } from "@07nghiep/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@07nghiep/ui/components/dialog";
import { Label } from "@07nghiep/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@07nghiep/ui/components/select";
import { Textarea } from "@07nghiep/ui/components/textarea";
import { trpc } from "../../utils/trpc";
import { toast } from "sonner";

interface ReportSubmitButtonProps {
  contentType: "JOB" | "USER" | "MESSAGE";
  contentId: string;
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ReportSubmitButton({
  contentType,
  contentId,
  variant = "outline",
  size = "sm",
}: ReportSubmitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState<string>("");
  const [description, setDescription] = useState("");

  const createReportMutation = useMutation(
    trpc.report.create.mutationOptions({
      onSuccess: () => {
        toast.success("Báo cáo của bạn đã được gửi. Chúng tôi sẽ xem xét và xử lý.");
        setIsOpen(false);
        setReportType("");
        setDescription("");
      },
      onError: (error: Error) => {
        toast.error(error.message || "Có lỗi xảy ra. Vui lòng thử lại.");
      },
    })
  );

  const reportTypes = [
    { value: "INAPPROPRIATE_CONTENT", label: "Nội dung không phù hợp" },
    { value: "SPAM", label: "Spam" },
    { value: "SCAM_FRAUD", label: "Lừa đảo" },
    { value: "DUPLICATE_POSTING", label: "Đăng trùng" },
    { value: "OTHER", label: "Khác" },
  ];

  const handleSubmit = async () => {
    if (!reportType) {
      toast.error("Vui lòng chọn loại vi phạm");
      return;
    }

    createReportMutation.mutate({
      contentType,
      contentId,
      // biome-ignore lint/suspicious/noExplicitAny: string to enum coercion
      reportType: reportType as any,
      description: description || undefined,
    });
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setIsOpen(true)}>
        <Flag className="h-4 w-4" />
        <span className="ml-2">Báo cáo</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="mb-2 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <DialogTitle className="text-center">Báo cáo vi phạm</DialogTitle>
            <DialogDescription className="text-center">
              Vui lòng cung cấp thông tin về nội dung vi phạm. Chúng tôi sẽ xem xét và xử lý
              sớm nhất.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reportType">Loại vi phạm *</Label>
              <Select value={reportType} onValueChange={(val) => setReportType(val ?? "")}>
                <SelectTrigger id="reportType">
                  <SelectValue placeholder="Chọn loại vi phạm" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả (tùy chọn)</Label>
              <Textarea
                id="description"
                placeholder="Mô tả chi tiết về vi phạm..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsOpen(false)}
                disabled={createReportMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={createReportMutation.isPending || !reportType}
              >
                {createReportMutation.isPending ? "Đang gửi..." : "Gửi báo cáo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
