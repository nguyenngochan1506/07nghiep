import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, XCircle, Edit } from "lucide-react";
import { formatDistance } from "date-fns";
import { vi } from "date-fns/locale";

import { Button } from "@07nghiep/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@07nghiep/ui/components/dialog";
import { trpc } from "../../utils/trpc";
import { JobModerationActions } from "./job-moderation-actions";
import type { RouterOutputs } from "@07nghiep/server/routers/index";

type JobForReview = RouterOutputs["admin"]["moderation"]["getJobForReview"];

interface JobReviewPanelProps {
  jobId: string;
  onClose: () => void;
  mode?: "review" | "view"; // review = show actions, view = readonly
}

export function JobReviewPanel({ jobId, onClose, mode = "review" }: JobReviewPanelProps) {
  const [showModerationActions, setShowModerationActions] = useState(false);
  const [action, setAction] = useState<"approve" | "reject" | "request-changes" | null>(null);

  // Fetch job by ID
  const { data: job, isLoading } = useQuery(
    trpc.admin.moderation.getJobForReview.queryOptions({ jobId })
  ) as { data: JobForReview | undefined; isLoading: boolean };

  const handleAction = (selectedAction: "approve" | "reject" | "request-changes") => {
    setAction(selectedAction);
    setShowModerationActions(true);
  };

  const handleActionComplete = () => {
    setShowModerationActions(false);
    setAction(null);
    onClose();
  };

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!job) {
    return null;
  }

  const isPending = job.status === "PENDING_APPROVAL";

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] !w-[90vw] !max-w-[90vw] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-2xl">{job.title}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {job.organization.name}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className={`rounded-sm px-2 py-1 text-xs font-medium ${
                isPending 
                  ? "bg-warning/10 text-warning" 
                  : "bg-success/10 text-success"
              }`}>
                {isPending ? "Chờ duyệt" : "Đã duyệt"}
              </span>
              <span className="text-sm text-muted-foreground">
                Đăng{" "}
                {formatDistance(new Date(job.createdAt), new Date(), {
                  addSuffix: true,
                  locale: vi,
                })}
              </span>
            </div>

            {/* Employer Info */}
            <div className="rounded-lg border bg-secondary/30 p-4">
              <h3 className="mb-2 font-semibold">Thông tin nhà tuyển dụng</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Tên:</span>{" "}
                  {job.organization.user.name}
                </p>
                <p>
                  <span className="font-medium">Email:</span>{" "}
                  {job.organization.user.email}
                </p>
                <p>
                  <span className="font-medium">Công ty:</span>{" "}
                  {job.organization.name}
                </p>
              </div>
            </div>

            {/* Job Details */}
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Chi tiết công việc</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Vị trí:</span> {job.location}
                  </div>
                  <div>
                    <span className="font-medium">Hình thức:</span> {job.workType}
                  </div>
                  <div>
                    <span className="font-medium">Loại hợp đồng:</span> {job.jobType}
                  </div>
                  <div>
                    <span className="font-medium">Kinh nghiệm:</span>{" "}
                    {job.experienceLevel}
                  </div>
                  {job.salaryMin && job.salaryMax && (
                    <div className="col-span-2">
                      <span className="font-medium">Mức lương:</span>{" "}
                      {job.salaryMin.toString()} - {job.salaryMax.toString()}{" "}
                      {job.salaryType}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Mô tả công việc</h3>
                <div className="whitespace-pre-wrap rounded-lg bg-secondary/30 p-4 text-sm">
                  {job.description}
                </div>
              </div>

              {job.requirements && (
                <div>
                  <h3 className="mb-2 font-semibold">Yêu cầu</h3>
                  <div className="whitespace-pre-wrap rounded-lg bg-secondary/30 p-4 text-sm">
                    {job.requirements}
                  </div>
                </div>
              )}

              {job.benefits && (
                <div>
                  <h3 className="mb-2 font-semibold">Quyền lợi</h3>
                  <div className="whitespace-pre-wrap rounded-lg bg-secondary/30 p-4 text-sm">
                    {job.benefits}
                  </div>
                </div>
              )}
            </div>

            {/* Moderation Actions */}
            {isPending && mode === "review" && (
              <div className="flex gap-3 border-t pt-4">
                <Button
                  className="flex-1"
                  variant="default"
                  onClick={() => handleAction("approve")}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Phê duyệt
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => handleAction("request-changes")}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Yêu cầu chỉnh sửa
                </Button>
                <Button
                  className="flex-1"
                  variant="destructive"
                  onClick={() => handleAction("reject")}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Từ chối
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Moderation Actions Dialog */}
      {showModerationActions && action && (
        <JobModerationActions
          jobId={jobId}
          action={action}
          onClose={() => setShowModerationActions(false)}
          onComplete={handleActionComplete}
        />
      )}
    </>
  );
}
