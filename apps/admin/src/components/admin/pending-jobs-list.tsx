import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistance } from "date-fns";
import { vi } from "date-fns/locale";
import { AlertCircle, Building2, MapPin, Calendar, Eye } from "lucide-react";

import { Button } from "@07nghiep/ui/components/button";
import { trpc } from "../../utils/trpc";
import { JobReviewPanel } from "./job-review-panel";

export function PendingJobsList() {
  const [page, setPage] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    trpc.admin.moderation.listPendingJobs.queryOptions({
      page,
      limit: 20,
    })
  );

  const refetch = () => {
    queryClient.invalidateQueries({ 
      queryKey: trpc.admin.moderation.listPendingJobs.queryKey({ page, limit: 20 }) 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">Không có việc làm chờ duyệt</h3>
        <p className="text-sm text-muted-foreground">
          Tất cả tin tuyển dụng đã được xử lý
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Việc làm chờ duyệt</h2>
          <p className="text-sm text-muted-foreground">
            {data.total} tin tuyển dụng cần xét duyệt
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {data.data.map((job) => (
          <div
            key={job.id}
            className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Company Logo */}
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-secondary">
              {job.organization.logoUrl ? (
                <img
                  src={job.organization.logoUrl}
                  alt={job.organization.name}
                  className="h-full w-full rounded-md object-cover"
                />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            {/* Job Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-sm bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                      Chờ duyệt
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold">{job.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {job.organization.name}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </div>
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {job.workType}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDistance(new Date(job.createdAt), new Date(), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </div>
              </div>

              <div className="text-sm">
                <span className="font-medium">Đăng bởi:</span>{" "}
                <span className="text-muted-foreground">
                  {job.organization.user.email}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedJobId(job.id)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Xem chi tiết
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
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

      {/* Job Review Panel */}
      {selectedJobId && (
        <JobReviewPanel
          jobId={selectedJobId}
          onClose={() => {
            setSelectedJobId(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
