import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { JobCardItem } from "@/components/job-card";
import { SearchBar } from "@/components/search-bar";
import { JobFilters } from "@/components/job-filters";
import { useJobs } from "@/routes/__root";
import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/jobs/")({
    component: JobsPage,
});

const ITEMS_PER_PAGE = 4;

function JobsPage() {
    const { jobs } = useJobs();
    const savedJobsOptions = trpc.savedJob.list.queryOptions({ pageSize: 50 });
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
            const matchKeyword = keyword === "" || job.title.toLowerCase().includes(keyword.toLowerCase()) || job.companyName.toLowerCase().includes(keyword.toLowerCase());

            const searchLocation = location || filters.location;
            const matchLocation = searchLocation === "" || job.location.toLowerCase().includes(searchLocation.toLowerCase());

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
    const paginatedJobs = filteredJobs
        .slice(startIndex, startIndex + ITEMS_PER_PAGE)
        .map((job) => ({
            ...job,
            isSaved: savedIds.has(job.id),
        }));

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white py-12 px-4 md:px-8 border-b border-gray-200">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="text-center space-y-3">
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900">
                            Find Your Dream Job
                        </h1>
                        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                            Khám phá hàng ngàn cơ hội việc làm phù hợp với kỹ năng, vị trí và mức độ kinh nghiệm của bạn.
                        </p>
                    </div>

                    <SearchBar onSearch={handleSearch} initialKeyword={keyword} />
                </div>
            </div>

            <div className="max-w-7xl mx-auto w-full px-4 py-8 flex gap-8 flex-col lg:flex-row">
                <aside className="shrink-0 w-full lg:w-[280px]">
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

                <main className="flex-1 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-700">
                            Tìm thấy {filteredJobs.length} công việc
                        </h2>
                    </div>

                    {paginatedJobs.length > 0 ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {paginatedJobs.map((job) => (
                                    <JobCardItem
                                        key={job.id}
                                        job={job as any}
                                        onSave={(jobId) => toggleSavedJob.mutate({ jobId })}
                                    />
                                ))}
                            </div>

                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-4 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md disabled:opacity-50 hover:bg-gray-50 transition"
                                    >
                                        Trang trước
                                    </button>
                                    <span className="text-sm text-gray-600 font-medium">
                                        Trang {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md disabled:opacity-50 hover:bg-gray-50 transition"
                                    >
                                        Trang sau
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <p className="text-gray-500">
                                Không có công việc nào phù hợp với bộ lọc hiện tại.
                            </p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
