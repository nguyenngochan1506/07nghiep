import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Loader2,
  Search,
  ChevronsUpDown,
  SearchX,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@07nghiep/ui/components/card";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { Input } from "@07nghiep/ui/components/input";
import { Button } from "@07nghiep/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@07nghiep/ui/components/select";

import { trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import { PageHero } from "@/components/page-hero";
import {
  ApplicationCard,
  type ApplicationCardProps,
} from "@/components/application/application-card";

import { createSeoHead, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/applications/")({
  head: () =>
    createSeoHead({
      title: "Đơn ứng tuyển | 07nghiep",
      description: "Theo dõi trạng thái đơn ứng tuyển và quản lý hồ sơ đã gửi.",
      url: `${SITE_URL}/applications`,
    }),
  component: ApplicationsPage,
});

const APPLICATION_STATUS_FILTERS = [
  "ALL",
  "PENDING",
  "VIEWED",
  "SHORTLISTED",
  "INTERVIEWING",
  "OFFERED",
  "REJECTED",
  "WITHDRAWN",
] as const;

type ApplicationStatusFilter = (typeof APPLICATION_STATUS_FILTERS)[number];
type ApplicationStatus = Exclude<ApplicationStatusFilter, "ALL">;
type ApplicationListItem = Omit<ApplicationCardProps, "job"> & {
  job: ApplicationCardProps["job"];
};
type ApplicationListApiItem = {
  id: string;
  status: string;
  appliedAt: string | Date;
  job: {
    id: string;
    title: string;
    organization: {
      name: string;
    } | null;
  } | null;
};

function isApplicationStatusFilter(value: unknown): value is ApplicationStatusFilter {
  if (typeof value !== "string") return false;
  return APPLICATION_STATUS_FILTERS.includes(value as ApplicationStatusFilter);
}

function ApplicationsPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const isLoggedIn = Boolean(session?.user?.id);

  // Controlled UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // Debounce searchTerm -> debouncedSearchTerm
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  // Use trpc queryOptions with useQuery so TanStack Query auto-refetches when inputs change
  const { data, isLoading, isFetching } = useQuery(
    trpc.applications.list.queryOptions(
      {
        search: debouncedSearchTerm || undefined,
        status: statusFilter === "ALL" ? undefined : (statusFilter as ApplicationStatus),
        sortBy: sortBy,
      },
      { enabled: isLoggedIn },
    ),
  );

  const applicationsSource =
    (data as unknown as readonly ApplicationListApiItem[] | undefined) ?? [];
  const applications = useMemo<ApplicationListItem[]>(
    () =>
      applicationsSource.map((application) => ({
        id: application.id,
        status: application.status,
        appliedAt: application.appliedAt,
        job: application.job
          ? {
              id: application.job.id,
              title: application.job.title,
              organization: application.job.organization
                ? { name: application.job.organization.name }
                : null,
            }
          : null,
      })),
    [applicationsSource],
  );

  return (
    <div className="min-h-screen bg-background">
      <PageHero
        image="applications"
        eyebrow={
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-orange/30 bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
            <BriefcaseBusiness className="h-4 w-4" />
            Hồ sơ ứng tuyển
          </p>
        }
        title="Danh sách đơn ứng tuyển"
        description="Theo dõi toàn bộ đơn bạn đã gửi, xem trạng thái xử lý và mở chi tiết khi cần chỉnh sửa."
        meta={
          <span className="inline-flex items-center gap-2">
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {applications.length} đơn ứng tuyển
          </span>
        }
      />

      <main className="container mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* Search, Filter, Sort Bar */}
        {!isLoading && applications.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                type="text"
                placeholder="Tìm theo tên công việc hoặc công ty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 bg-transparent p-0 placeholder:text-muted-foreground focus-visible:ring-0"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  if (isApplicationStatusFilter(value)) setStatusFilter(value);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Lọc theo trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="PENDING">Chờ duyệt</SelectItem>
                  <SelectItem value="VIEWED">Đã xem</SelectItem>
                  <SelectItem value="SHORTLISTED">Vào shortlist</SelectItem>
                  <SelectItem value="INTERVIEWING">Phỏng vấn</SelectItem>
                  <SelectItem value="OFFERED">Đề nghị</SelectItem>
                  <SelectItem value="REJECTED">Từ chối</SelectItem>
                  <SelectItem value="WITHDRAWN">Đã rút</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
                title={`Sắp xếp: ${sortBy === "newest" ? "Mới nhất" : "Cũ nhất"}`}
                className="gap-2"
              >
                <ChevronsUpDown className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">
                  {sortBy === "newest" ? "Mới nhất" : "Cũ nhất"}
                </span>
              </Button>
            </div>
          </div>
        )}
        {sessionPending ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="p-0">
                <CardHeader className="space-y-3 border-b pb-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-4/5" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-8 w-28 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !isLoggedIn ? (
          <div className="flex min-h-96 items-center justify-center">
            <Card className="w-full max-w-xl border-dashed bg-card/70 p-0 text-center">
              <CardContent className="flex flex-col items-center gap-4 px-8 py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <BriefcaseBusiness className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">Đăng nhập để xem đơn ứng tuyển</h2>
                  <p className="text-sm text-muted-foreground">
                    Danh sách đơn ứng tuyển chỉ khả dụng sau khi bạn đăng nhập.
                  </p>
                </div>
                <Button asChild>
                  <Link to="/login">Đăng nhập</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="p-0">
                <CardHeader className="space-y-3 border-b pb-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-4/5" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-8 w-28 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : applications.length === 0 ? (
          // Distinguish between 'no applications at all' and 'no search results'
          (searchTerm && searchTerm.trim() !== "") || statusFilter !== "ALL" ? (
            <div className="flex min-h-96 items-center justify-center">
              <Card className="w-full max-w-xl border-dashed bg-card/70 p-0 text-center">
                <CardContent className="flex flex-col items-center gap-4 px-8 py-16">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <SearchX className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">Không tìm thấy kết quả</h2>
                    <p className="text-sm text-muted-foreground">
                      Không có đơn ứng tuyển phù hợp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setSearchTerm("");
                        setDebouncedSearchTerm("");
                        setStatusFilter("ALL");
                        setSortBy("newest");
                      }}
                    >
                      Quay lại tất cả đơn
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex min-h-96 items-center justify-center">
              <Card className="w-full max-w-xl border-dashed bg-card/70 p-0 text-center">
                <CardContent className="flex flex-col items-center gap-4 px-8 py-16">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <BriefcaseBusiness className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">Bạn chưa có đơn ứng tuyển nào</h2>
                    <p className="text-sm text-muted-foreground">
                      Hãy tìm một công việc phù hợp và gửi đơn ứng tuyển đầu tiên của bạn.
                    </p>
                  </div>
                  <Link
                    to="/jobs"
                    className="inline-flex items-center gap-2 rounded-md bg-brand-orange px-4 py-2 text-sm font-medium text-brand-orange-foreground transition-colors hover:bg-brand-orange/90"
                  >
                    Tìm việc ngay
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          )
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {applications.map((application) => (
              <Link
                key={application.id}
                to="/applications/$applicationId"
                params={{ applicationId: application.id }}
                className="group block h-full focus:outline-none"
              >
                <ApplicationCard
                  id={application.id}
                  status={application.status}
                  appliedAt={application.appliedAt}
                  job={application.job}
                />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
