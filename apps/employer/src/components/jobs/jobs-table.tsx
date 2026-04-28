import { useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Copy,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@07nghiep/ui/components/button";
import { Input } from "@07nghiep/ui/components/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@07nghiep/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@07nghiep/ui/components/table";
import { JobStatusBadge } from "./job-status-badge";

type JobStatus = "DRAFT" | "PENDING_APPROVAL" | "OPEN" | "CLOSED" | "ARCHIVED";

export interface JobRow {
  id: string;
  title: string;
  location: string;
  jobType: string;
  workType: string;
  status: JobStatus;
  applicationsCount: number;
  views: number;
  publishedAt: Date | string | null;
  expiresAt: Date | string | null;
  createdAt: Date | string;
}

interface JobsTableProps {
  jobs: JobRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  statusFilter: string;
  onSearchChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onPublish: (id: string) => void;
  onClose: (id: string) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

const STATUS_TABS = [
  { value: "", label: "Tất cả" },
  { value: "DRAFT", label: "Nháp" },
  { value: "OPEN", label: "Đang tuyển" },
  { value: "CLOSED", label: "Đã đóng" },
  { value: "ARCHIVED", label: "Lưu trữ" },
];

const JOB_TYPE_LABELS: Record<string, string> = {
  FULLTIME: "Toàn thời gian",
  PARTIME: "Bán thời gian",
  CONTRACT: "Hợp đồng",
  INTERNSHIP: "Thực tập",
  FREELANCE: "Freelance",
};

export function JobsTable({
  jobs,
  total,
  page,
  pageSize,
  totalPages,
  search,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onPageChange,
  onPublish,
  onClose,
  onClone,
  onDelete,
  isLoading,
}: JobsTableProps) {
  const navigate = useNavigate();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleDelete(id: string) {
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="jobs-search"
            placeholder="Tìm kiếm theo tiêu đề..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 rounded-lg border bg-muted p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onStatusChange(tab.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tiêu đề</TableHead>
              <TableHead className="hidden sm:table-cell">Loại</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="hidden md:table-cell text-center">
                <Eye className="mx-auto h-4 w-4" />
              </TableHead>
              <TableHead className="hidden md:table-cell text-center">
                <FileText className="mx-auto h-4 w-4" />
              </TableHead>
              <TableHead className="hidden lg:table-cell">Hết hạn</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Đang tải...
                  </div>
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-8 w-8" />
                    <p>Không có tin tuyển dụng nào</p>
                    <Link to="/jobs/new">
                      <Button size="sm" variant="outline">
                        Đăng tin đầu tiên
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium leading-tight">{job.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {job.location}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
                  </TableCell>
                  <TableCell>
                    <JobStatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center text-sm">
                    {job.views}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center text-sm">
                    {job.applicationsCount}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {job.expiresAt
                      ? new Date(job.expiresAt).toLocaleDateString("vi-VN")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            id={`job-actions-${job.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            navigate({
                              to: "/my-jobs/$jobId/edit",
                              params: { jobId: job.id },
                            })
                          }
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>

                        {(job.status === "DRAFT" || job.status === "CLOSED") && (
                          <DropdownMenuItem onClick={() => onPublish(job.id)}>
                            <CheckCircle className="mr-2 h-4 w-4 text-success" />
                            Đăng tin
                          </DropdownMenuItem>
                        )}

                        {job.status === "OPEN" && (
                          <DropdownMenuItem onClick={() => onClose(job.id)}>
                            <XCircle className="mr-2 h-4 w-4 text-warning" />
                            Đóng tin
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem onClick={() => onClone(job.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Nhân bản
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => handleDelete(job.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {confirmDeleteId === job.id
                            ? "Xác nhận xóa?"
                            : "Xóa tin"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total} tin
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Need to import this for the empty state
function Briefcase({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 14.15v4.073a2.25 2.25 0 01-2.25 2.25h-12a2.25 2.25 0 01-2.25-2.25V14.15M6 10.5V9a3 3 0 013-3h6a3 3 0 013 3v1.5M15 10.5a3 3 0 01-3 3 3 3 0 01-3-3"
      />
    </svg>
  );
}
