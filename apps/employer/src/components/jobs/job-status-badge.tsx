import { Badge } from "@07nghiep/ui/components/badge";

type JobStatus = "DRAFT" | "PENDING_APPROVAL" | "OPEN" | "CLOSED" | "ARCHIVED";

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  DRAFT: { label: "Nháp", variant: "secondary" },
  PENDING_APPROVAL: { label: "Chờ duyệt", variant: "outline" },
  OPEN: { label: "Đang tuyển", variant: "default" },
  CLOSED: { label: "Đã đóng", variant: "destructive" },
  ARCHIVED: { label: "Lưu trữ", variant: "secondary" },
};

interface JobStatusBadgeProps {
  status: JobStatus;
  className?: string;
}

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
