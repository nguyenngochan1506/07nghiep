import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import type React from "react";
import { JobCardItem } from "@/components/job-card";
import { SearchBar } from "@/components/search-bar";
import { JobFilters } from "@/components/job-filters";
import { authClient } from "@/lib/auth-client";
import { useJobs } from "@/routes/__root";
import { queryClient, trpc } from "@/utils/trpc";
import { Button } from "@07nghiep/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@07nghiep/ui/components/card";
import { Skeleton } from "@07nghiep/ui/components/skeleton";

export const Route = createFileRoute("/jobs/")({
  component: JobsPage,
});

const ITEMS_PER_PAGE = 4;
type JobCardItemProps = React.ComponentProps<typeof JobCardItem>;

function JobsPage() {
  const { jobs, isLoading, isError } = useJobs();
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

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");

  const [filters, setFilters] = useState({ location: "", workType: "" });
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearch = (newKeyword: string, newLocation: string = "") => {
    setKeyword(newKeyword);
    setLocation(newLocation);
    setCurrentPage(1);
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchKeyword =
        keyword === "" ||
        job.title.toLowerCase().includes(keyword.toLowerCase()) ||
        job.companyName.toLowerCase().includes(keyword.toLowerCase());

      const searchLocation = location || filters.location;
      const matchLocation =
        searchLocation === "" || job.location.toLowerCase().includes(searchLocation.toLowerCase());

      const matchWorkType = filters.workType === "" || job.workType === filters.workType;
      return matchKeyword && matchLocation && matchWorkType;
    });
  }, [keyword, location, filters, jobs]);

  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const savedIds = useMemo(
    () => new Set((savedJobsQuery.data?.jobs ?? []).map((job) => job.id)),
    [savedJobsQuery.data?.jobs],
  );
  const paginatedJobs: JobCardItemProps["job"][] = filteredJobs
    .slice(startIndex, startIndex + ITEMS_PER_PAGE)
    .map((job) => ({
      ...job,
      isSaved: savedIds.has(job.id),
    }));

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <div className="border-b bg-secondary/30 px-4 py-12 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Tìm việc đúng với bạn
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Khám phá hàng ngàn cơ hội việc làm phù hợp với kỹ năng, vị trí và mức độ kinh nghiệm
              của bạn.
            </p>
          </div>

          <SearchBar onSearch={handleSearch} initialKeyword={keyword} />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-[280px]">
          <JobFilters
            filters={filters}
            setFilters={(newFilters) => {
              if (typeof newFilters === "function") {
                setFilters(newFilters);
              } else {
                setFilters(newFilters);
              }
              setCurrentPage(1);
            }}
          />
        </aside>

        <main className="flex flex-1 flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Tìm thấy {filteredJobs.length} công việc
            </h2>
          </div>

          {isLoading ? (
            <JobsLoadingState />
          ) : isError ? (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle>Không tải được danh sách việc</CardTitle>
                <CardDescription>Vui lòng thử lại sau khi kết nối API ổn định.</CardDescription>
              </CardHeader>
            </Card>
          ) : paginatedJobs.length > 0 ? (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {paginatedJobs.map((job) => (
                  <JobCardItem
                    key={job.id}
                    job={job}
                    onSave={isLoggedIn ? (jobId) => toggleSavedJob.mutate({ jobId }) : undefined}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-2 flex items-center justify-center gap-4">
                  <Button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                  >
                    Trang trước
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <Button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
              <CardContent className="py-12 text-center text-muted-foreground">
                Không có công việc nào phù hợp với bộ lọc hiện tại.
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
