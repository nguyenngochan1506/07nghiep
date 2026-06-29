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
import { PageHero } from "@/components/page-hero";
import { SearchBar } from "@/components/search-bar";
import { authClient } from "@/lib/auth-client";
import { useLocalSavedJobs } from "@/lib/saved-jobs";
import { mapJob, type PublicJob } from "@/routes/__root";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/jobs/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    keyword?: string;
    location?: string;
    industry?: string;
    page?: number;
  } => ({
    keyword: typeof search.keyword === "string" && search.keyword ? search.keyword : undefined,
    location: typeof search.location === "string" && search.location ? search.location : undefined,
    industry: typeof search.industry === "string" && search.industry ? search.industry : undefined,
    page: (() => {
      const page = typeof search.page === "string" ? Number(search.page) : search.page;
      return typeof page === "number" && Number.isInteger(page) && page > 0 ? page : undefined;
    })(),
  }),
  component: JobsPage,
});

const ITEMS_PER_PAGE = 15;
type JobCardItemProps = React.ComponentProps<typeof JobCardItem>;

function splitMultiSearchParam(value?: string) {
  if (!value) return [];

  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinMultiSearchParam(value: string[]) {
  return value.length > 0 ? value.join("|") : undefined;
}

function JobsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session;
  const savedJobsOptions = trpc.savedJob.list.queryOptions(
    { pageSize: 50 },
    { enabled: isLoggedIn },
  );
  const savedJobsQuery = useQuery(savedJobsOptions);
  const localSavedJobs = useLocalSavedJobs();
  const toggleSavedJob = useMutation({
    mutationFn: (input: { jobId: string }) => trpcClient.savedJob.toggle.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedJobsOptions.queryKey });
    },
  });

  const [keyword, setKeyword] = useState(search.keyword ?? "");
  const [locations, setLocations] = useState(() => splitMultiSearchParam(search.location));
  const [industries, setIndustries] = useState(() => splitMultiSearchParam(search.industry));

  const [currentPage, setCurrentPage] = useState(search.page ?? 1);
  const resultsTopRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollResultsRef = useRef(false);
  const industriesQuery = useQuery(trpc.job.getIndustries.queryOptions());
  const jobsQuery = useQuery(
    trpc.job.getPublicList.queryOptions({
      keyword: keyword || undefined,
      locations: locations.length > 0 ? locations : undefined,
      industries: industries.length > 0 ? industries : undefined,
      limit: ITEMS_PER_PAGE,
      offset: (currentPage - 1) * ITEMS_PER_PAGE,
    }),
  );

  useEffect(() => {
    setKeyword(search.keyword ?? "");
    setLocations(splitMultiSearchParam(search.location));
    setIndustries(splitMultiSearchParam(search.industry));
    setCurrentPage(search.page ?? 1);
  }, [search.keyword, search.location, search.industry, search.page]);

  const handleSearch = useCallback(
    (newKeyword: string, nextLocations: string[] = [], nextIndustries: string[] = []) => {
      setKeyword(newKeyword);
      setLocations(nextLocations);
      setIndustries(nextIndustries);
      setCurrentPage(1);
      navigate({
        search: {
          keyword: newKeyword.trim() || undefined,
          location: joinMultiSearchParam(nextLocations),
          industry: joinMultiSearchParam(nextIndustries),
          page: undefined,
        },
        replace: true,
      });
    },
    [navigate],
  );

  const jobsData = jobsQuery.data as { jobs?: PublicJob[]; total?: number } | undefined;
  const jobs = useMemo(() => (jobsData?.jobs ?? []).map((job) => mapJob(job)), [jobsData]);
  const totalJobs = jobsData?.total ?? 0;
  const totalPages = Math.ceil(totalJobs / ITEMS_PER_PAGE);
  const handlePageChange = useCallback(
    (nextPage: number) => {
      const safePage = Math.min(Math.max(1, nextPage), Math.max(1, totalPages));
      shouldScrollResultsRef.current = true;
      setCurrentPage(safePage);
      navigate({
        search: {
          keyword: keyword.trim() || undefined,
          location: joinMultiSearchParam(locations),
          industry: joinMultiSearchParam(industries),
          page: safePage > 1 ? safePage : undefined,
        },
      });
    },
    [industries, keyword, locations, navigate, totalPages],
  );

  useEffect(() => {
    if (!shouldScrollResultsRef.current || jobsQuery.isFetching) return;

    shouldScrollResultsRef.current = false;
    resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [jobsQuery.isFetching]);
  const savedJobsData = savedJobsQuery.data as { jobs?: { id: string }[] } | undefined;
  const savedJobRows = savedJobsData?.jobs ?? [];
  const dbSavedIds = useMemo(() => new Set(savedJobRows.map((job) => job.id)), [savedJobRows]);
  const savedIds = isLoggedIn ? dbSavedIds : localSavedJobs.savedIds;
  const paginatedJobs: JobCardItemProps["job"][] = jobs.map((job) => ({
    ...job,
    isSaved: savedIds.has(job.id),
  }));
  const activeFilterCount = [keyword].filter(Boolean).length + locations.length + industries.length;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <PageHero
        image="jobs"
        eyebrow={<Badge className="w-fit bg-accent text-accent-foreground">Job discovery</Badge>}
        title="Tìm việc đúng với bạn"
        description="Khám phá hàng ngàn cơ hội việc làm phù hợp với kỹ năng, vị trí và mức độ kinh nghiệm của bạn."
      >
        <SearchBar
          onSearch={handleSearch}
          initialKeyword={search.keyword ?? ""}
          initialLocations={splitMultiSearchParam(search.location)}
          initialIndustries={splitMultiSearchParam(search.industry)}
          industryOptions={industriesQuery.data ?? []}
          isLoadingIndustries={industriesQuery.isLoading}
        />
      </PageHero>

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
                    onSave={(jobId) => {
                      if (isLoggedIn) {
                        toggleSavedJob.mutate({ jobId });
                        return;
                      }

                      const targetJob = paginatedJobs.find((item) => item.id === jobId);
                      if (targetJob) localSavedJobs.toggleSavedJob(targetJob);
                    }}
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
                    setIndustries([]);
                    setCurrentPage(1);
                    navigate({
                      search: {
                        keyword: undefined,
                        location: undefined,
                        industry: undefined,
                        page: undefined,
                      },
                    });
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
