import { useState } from "react";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Briefcase, FileText, Eye, TrendingUp } from "lucide-react";

import { Button } from "@07nghiep/ui/components/button";
import { Card } from "@07nghiep/ui/components/card";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { authorizedRoles } from "@/lib/role-guard";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { JobsTable, type JobRow } from "@/components/jobs/jobs-table";

export const Route = createFileRoute("/my-jobs/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) redirect({ to: "/login", throw: true });
    const role = (session.data?.user as { role?: string }).role ?? "CANDIDATE";
    if (!authorizedRoles(role)) {
      await authClient.signOut();
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
  component: MyJobsPage,
});

function MyJobsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // ── Stats ─────────────────────────────────────────────────────────────────
  const statsQuery = useQuery(trpc.job.getMyStats.queryOptions());

  // ── Jobs list ─────────────────────────────────────────────────────────────
  const jobsQuery = useQuery(
    trpc.job.getMyJobs.queryOptions({
      page,
      pageSize: 10,
      search: search || undefined,
      status:
        (statusFilter as "DRAFT" | "OPEN" | "CLOSED" | "ARCHIVED" | "PENDING_APPROVAL") ||
        undefined,
    }),
  );

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["job"] });
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  const publishMutation = useMutation(
    trpc.job.publish.mutationOptions({
      onSuccess: () => {
        toast.success("Đã gửi tin tuyển dụng để duyệt");
        invalidateAll();
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const closeMutation = useMutation(
    trpc.job.close.mutationOptions({
      onSuccess: () => {
        toast.success("Đã đóng tin tuyển dụng");
        invalidateAll();
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const cloneMutation = useMutation(
    trpc.job.clone.mutationOptions({
      onSuccess: () => {
        toast.success("Đã nhân bản tin tuyển dụng → Nháp mới");
        invalidateAll();
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.job.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Đã xóa tin tuyển dụng");
        invalidateAll();
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const stats = statsQuery.data;
  const jobs = (jobsQuery.data?.jobs ?? []) as JobRow[];

  const STAT_CARDS = [
    {
      icon: Briefcase,
      label: "Đang tuyển",
      value: stats?.openJobs ?? 0,
      sublabel: `${stats?.draftJobs ?? 0} nháp`,
    },
    {
      icon: FileText,
      label: "Tổng đơn ứng tuyển",
      value: stats?.totalApplications ?? 0,
      sublabel: "tất cả tin",
    },
    {
      icon: Eye,
      label: "Tổng lượt xem",
      value: stats?.totalViews ?? 0,
      sublabel: "tất cả tin",
    },
    {
      icon: TrendingUp,
      label: "Tổng tin đăng",
      value: stats?.totalJobs ?? 0,
      sublabel: `${stats?.closedJobs ?? 0} đã đóng`,
    },
  ];

  return (
    <div className="min-h-screen bg-secondary/30 px-4 py-8">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quản lý tin tuyển dụng</h1>
            <p className="text-sm text-muted-foreground">Quản lý tất cả tin tuyển dụng của bạn</p>
          </div>
          <Link to="/jobs/new">
            <Button id="new-job-btn" className="gap-2">
              <Plus className="h-4 w-4" />
              Đăng tin mới
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map((stat) => (
            <Card key={stat.label} className="p-5">
              <div className="flex items-center justify-between">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              {statsQuery.isLoading ? (
                <Skeleton className="mt-3 h-8 w-16" />
              ) : (
                <p className="mt-3 text-3xl font-bold">{stat.value.toLocaleString("vi-VN")}</p>
              )}
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.sublabel}</p>
            </Card>
          ))}
        </div>

        {/* Jobs Table */}
        <Card className="p-6">
          <JobsTable
            jobs={jobs}
            total={jobsQuery.data?.pagination.total ?? 0}
            page={page}
            pageSize={10}
            totalPages={jobsQuery.data?.pagination.totalPages ?? 1}
            search={search}
            statusFilter={statusFilter}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            onStatusChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            onPageChange={setPage}
            onPublish={(id) => publishMutation.mutate({ id })}
            onClose={(id) => closeMutation.mutate({ id })}
            onClone={(id) => cloneMutation.mutate({ id })}
            onDelete={(id) => deleteMutation.mutate({ id })}
            isLoading={jobsQuery.isLoading}
          />
        </Card>
      </div>
    </div>
  );
}
