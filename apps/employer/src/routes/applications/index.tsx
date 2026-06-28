import { createFileRoute } from "@tanstack/react-router";
import { ApplicationStatus } from "@/types/application";
import { ApplicationList } from "../../components/applications/application-list";
import { ApplicationKanban } from "../../components/applications/application-kanban";
import { getStatusLabel } from "../../components/applications/application-card";
import { trpc, queryClient } from "../../utils/trpc";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@07nghiep/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@07nghiep/ui/components/select";
import { Input } from "@07nghiep/ui/components/input";
import { LayoutGrid, List as ListIcon, Search } from "lucide-react";
import { useDebounce } from "../../hooks/use-debounce";
import { toast } from "sonner";

export const Route = createFileRoute("/applications/")({
  component: ApplicationsPage,
});

type JobListItem = {
  id: string;
  title: string;
};

type ApplicationListItem = {
  id: string;
  status: ApplicationStatus;
  appliedAt: Date | string;
  candidate: {
    name: string | null;
    image: string | null;
  };
  job?: {
    title: string;
  };
  aiScore?: {
    status: string;
    score: number | null;
    recommendation: string | null;
  } | null;
};

function isApplicationStatus(value: string): value is ApplicationStatus {
  return Object.values(ApplicationStatus).includes(value as ApplicationStatus);
}

function ApplicationsPage() {
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("ALL");
  const [jobFilter, setJobFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Queries
  const { data: jobsData } = useQuery(trpc.job.getMyJobs.queryOptions({ page: 1, pageSize: 50 }));
  const { data: applicationsData, isLoading } = useQuery(
    trpc.application.list.queryOptions({
      limit: 50,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      jobId: jobFilter === "ALL" ? undefined : jobFilter,
      search: debouncedSearch || undefined,
    }),
  );

  const applications = (applicationsData?.items ?? []) as ApplicationListItem[];
  const jobs = (jobsData?.jobs ?? []) as JobListItem[];

  const bulkUpdateStatusMutation = useMutation(
    trpc.application.bulkUpdateStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        setSelectedIds([]);
        toast.success("Đã cập nhật hồ sơ ứng tuyển");
      },
      onError: (err) => {
        toast.error(err.message || "Không thể cập nhật hồ sơ ứng tuyển");
      },
    }),
  );

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleToggleAll = (selectAll: boolean) => {
    setSelectedIds(selectAll ? applications.map((application) => application.id) : []);
  };

  const handleBulkStatusUpdate = (status: ApplicationStatus) => {
    if (selectedIds.length === 0) return;
    bulkUpdateStatusMutation.mutate({
      ids: selectedIds,
      status,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-8 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hồ sơ ứng tuyển</h1>
          <p className="text-muted-foreground">
            Quản lý và theo dõi hồ sơ ứng viên theo từng tin tuyển dụng.
          </p>
        </div>
        <div className="flex items-center bg-muted/50 p-1 rounded-lg">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-8"
            onClick={() => setViewMode("list")}
          >
            <ListIcon className="h-4 w-4 mr-2" />
            Danh sách
          </Button>
          <Button
            variant={viewMode === "kanban" ? "secondary" : "ghost"}
            size="sm"
            className="h-8"
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Bảng Kanban
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-muted/20 p-4 rounded-xl border">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm ứng viên..."
            className="pl-9 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={jobFilter} onValueChange={(value) => setJobFilter(value ?? "ALL")}>
          <SelectTrigger className="w-full sm:w-[250px] bg-background">
            <SelectValue placeholder="Tất cả tin tuyển dụng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả tin tuyển dụng</SelectItem>
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value && isApplicationStatus(value) ? value : "ALL")
          }
        >
          <SelectTrigger className="w-full sm:w-[200px] bg-background">
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            {(Object.values(ApplicationStatus) as ApplicationStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {getStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {viewMode === "list" && selectedIds.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-primary/5 text-primary border-primary/20 border rounded-xl">
          <span className="font-medium text-sm">{selectedIds.length} hồ sơ đã chọn</span>
          <div className="flex-1" />
          <span className="text-sm">Đổi trạng thái thành:</span>
          <Select
            onValueChange={(value) => {
              if (typeof value === "string" && isApplicationStatus(value)) {
                handleBulkStatusUpdate(value);
              }
            }}
          >
            <SelectTrigger className="w-[180px] h-8 bg-background">
              <SelectValue placeholder="Chọn trạng thái..." />
            </SelectTrigger>
            <SelectContent>
              {(Object.values(ApplicationStatus) as ApplicationStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {getStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Đang tải hồ sơ ứng tuyển...
        </div>
      ) : viewMode === "list" ? (
        <ApplicationList
          applications={applications}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleAll={handleToggleAll}
        />
      ) : (
        <ApplicationKanban applications={applications} />
      )}
    </div>
  );
}
