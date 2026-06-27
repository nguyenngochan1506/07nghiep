import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileWarning, AlertTriangle, Ban, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@07nghiep/ui/components/select";

import { trpc } from "../../utils/trpc";

export const Route = createFileRoute("/admin/reports/")({
  component: ReportsListPage,
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

const statusLabels: Record<string, { label: string; variant: "default" | "success" | "warning" }> = {
  PENDING: { label: "Chờ xử lý", variant: "warning" },
  RESOLVED: { label: "Đã xử lý", variant: "success" },
  DISMISSED: { label: "Đã bác bỏ", variant: "default" },
};

function ReportsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");

  const reportsQuery = useQuery(
    trpc.admin.moderation.listReports.queryOptions({
      page,
      limit: 20,
      status: statusFilter !== "all" ? (statusFilter as any) : undefined,
      type: typeFilter !== "all" ? (typeFilter as any) : undefined,
      contentType: contentTypeFilter !== "all" ? (contentTypeFilter as any) : undefined,
    })
  );

  const reports = reportsQuery.data?.data || [];
  const totalPages = reportsQuery.data?.totalPages || 1;

  if (reportsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Quản lý báo cáo</h1>
          <p className="text-muted-foreground mt-1">Xem và xử lý các báo cáo vi phạm</p>
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quản lý báo cáo</h1>
        <p className="text-muted-foreground mt-1">
          Xem và xử lý các báo cáo vi phạm từ người dùng
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Trạng thái</label>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "all")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                  <SelectItem value="RESOLVED">Đã xử lý</SelectItem>
                  <SelectItem value="DISMISSED">Đã bác bỏ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Loại nội dung</label>
              <Select value={contentTypeFilter} onValueChange={(val) => setContentTypeFilter(val ?? "all")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="JOB">Việc làm</SelectItem>
                  <SelectItem value="USER">Người dùng</SelectItem>
                  <SelectItem value="MESSAGE">Tin nhắn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Loại vi phạm</label>
              <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val ?? "all")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="INAPPROPRIATE_CONTENT">Nội dung không phù hợp</SelectItem>
                  <SelectItem value="SPAM">Spam</SelectItem>
                  <SelectItem value="SCAM_FRAUD">Lừa đảo</SelectItem>
                  <SelectItem value="DUPLICATE_POSTING">Đăng trùng</SelectItem>
                  <SelectItem value="OTHER">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports list */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileWarning className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Không có báo cáo nào</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report: any) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={statusLabels[report.status]?.variant || "default"}>
                        {statusLabels[report.status]?.label || report.status}
                      </Badge>
                      <Badge variant="outline">
                        {contentTypeLabels[report.contentType] || report.contentType}
                      </Badge>
                      <Badge variant="outline">
                        {reportTypeLabels[report.reportType] || report.reportType}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg mb-1">
                        {report.content?.title || report.content?.name || `${report.contentType} #${report.contentId.slice(0, 8)}`}
                      </h3>
                      {report.description && (
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Báo cáo bởi: <span className="font-medium">{report.reporter?.name || "Unknown"}</span>
                      </span>
                      <span>•</span>
                      <span>{new Date(report.createdAt).toLocaleDateString("vi-VN")}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate({ to: `/admin/reports/${report.id}` })}>
                      Xem chi tiết
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Trước
          </Button>
          <span className="text-sm">
            Trang {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
