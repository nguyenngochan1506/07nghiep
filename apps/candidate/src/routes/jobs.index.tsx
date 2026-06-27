import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@07nghiep/ui/components/card";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JobCardItem } from "@/components/job-card";
import { SearchBar } from "@/components/search-bar";
import { authClient } from "@/lib/auth-client";
import { mapJob } from "@/routes/__root";
import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/jobs/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    keyword?: string;
    location?: string;
  } => ({
    keyword: typeof search.keyword === "string" && search.keyword ? search.keyword : undefined,
    location: typeof search.location === "string" && search.location ? search.location : undefined,
  }),
  component: JobsPage,
});

const ITEMS_PER_PAGE = 15;
type JobCardItemProps = React.ComponentProps<typeof JobCardItem>;

function splitLocationSearchParam(location?: string) {
  if (!location) return [];

  return location
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function JobsPage() {
  const search = Route.useSearch();
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session;
  const savedJobsOptions = trpc.savedJob.list.queryOptions(
    { pageSize: 50 },
    { enabled: isLoggedIn },
  );
  const savedJobsQuery = useQuery(savedJobsOptions);
  const toggleSavedJob = useMutation(
    trpc.savedJob.toggle.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: savedJobsOptions.queryKey });
      },
    }),
  );

  const [keyword, setKeyword] = useState(search.keyword ?? "");
  const [locations, setLocations] = useState(() => splitLocationSearchParam(search.location));

  const [currentPage, setCurrentPage] = useState(1);
  const resultsTopRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollResultsRef = useRef(false);
  const jobsQuery = useQuery(
    trpc.job.getPublicList.queryOptions({
      keyword: keyword || undefined,
      locations: locations.length > 0 ? locations : undefined,
      limit: ITEMS_PER_PAGE,
      offset: (currentPage - 1) * ITEMS_PER_PAGE,
    }),
  );

  useEffect(() => {
    setKeyword(search.keyword ?? "");
    setLocations(splitLocationSearchParam(search.location));
    setCurrentPage(1);
  }, [search.keyword, search.location]);

  const handleSearch = useCallback((newKeyword: string, nextLocations: string[] = []) => {
    setKeyword(newKeyword);
    setLocations(nextLocations);
    setCurrentPage(1);
  }, []);

  const jobs = useMemo(
    () => jobsQuery.data?.jobs.map((job) => mapJob(job)) ?? [],
    [jobsQuery.data],
  );
  const totalJobs = jobsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(totalJobs / ITEMS_PER_PAGE);
  const handlePageChange = useCallback(
    (nextPage: number) => {
      const safePage = Math.min(Math.max(1, nextPage), Math.max(1, totalPages));
      shouldScrollResultsRef.current = true;
      setCurrentPage(safePage);
    },
    [totalPages],
  );

  useEffect(() => {
    if (!shouldScrollResultsRef.current || jobsQuery.isFetching) return;

    shouldScrollResultsRef.current = false;
    resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [jobsQuery.isFetching]);
  const savedIds = useMemo(
    () => new Set((savedJobsQuery.data?.jobs ?? []).map((job) => job.id)),
    [savedJobsQuery.data?.jobs],
  );
  const paginatedJobs: JobCardItemProps["job"][] = jobs.map((job) => ({
    ...job,
    isSaved: savedIds.has(job.id),
  }));
  const activeFilterCount = [keyword].filter(Boolean).length + locations.length;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <div className="border-b bg-surface-wash px-4 py-10 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-7">
          <div className="flex max-w-3xl flex-col gap-3">
            <Badge className="w-fit bg-accent text-accent-foreground">Job discovery</Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Tìm việc đúng với bạn
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Khám phá hàng ngàn cơ hội việc làm phù hợp với kỹ năng, vị trí và mức độ kinh nghiệm
              của bạn.
            </p>
          </div>

          <SearchBar
            onSearch={handleSearch}
            initialKeyword={search.keyword ?? ""}
            initialLocations={splitLocationSearchParam(search.location)}
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[96rem] px-4 py-8">
        <main ref={resultsTopRef} className="flex flex-1 scroll-mt-28 flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-xl border bg-primary p-4 text-primary-foreground shadow-md shadow-primary/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Tìm thấy {totalJobs} công việc</h2>
              <p className="text-sm text-primary-foreground/75">
                {jobsQuery.isLoading
                  ? "Đang cập nhật danh sách mới nhất."
                  : `Hiển thị ${paginatedJobs.length} việc trong trang ${currentPage}.`}
              </p>
            </div>
            {activeFilterCount > 0 ? (
              <Badge className="bg-brand-orange text-brand-orange-foreground">
                {activeFilterCount} bộ lọc đang dùng
              </Badge>
            ) : null}
          </div>

          {jobsQuery.isLoading ? (
            <JobsLoadingState />
          ) : jobsQuery.isError ? (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle>Không tải được danh sách việc</CardTitle>
                <CardDescription>Vui lòng thử lại sau khi kết nối API ổn định.</CardDescription>
              </CardHeader>
            </Card>
          ) : paginatedJobs.length > 0 ? (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {paginatedJobs.map((job) => (
                  <JobCardItem
                    key={job.id}
                    job={job}
                    onSave={isLoggedIn ? (jobId) => toggleSavedJob.mutate({ jobId }) : undefined}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                  >
                    Trang trước
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    variant="outline"
                  >
                    Trang sau
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  0
                </div>
                <div className="flex max-w-md flex-col gap-2">
                  <h3 className="text-lg font-semibold text-foreground">Chưa có kết quả phù hợp</h3>
                  <p className="text-sm text-muted-foreground">
                    Thử bỏ bớt bộ lọc, tìm theo kỹ năng rộng hơn hoặc quay lại danh sách tất cả.
                  </p>
                </div>
                <Button
                  type="button"
                  className="bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90"
                  onClick={() => {
                    setKeyword("");
                    setLocations([]);
                    setCurrentPage(1);
                  }}
                >
                  Xóa điều kiện tìm kiếm
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

function JobsLoadingState() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <Card key={item}>
          <CardHeader>
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-5 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
