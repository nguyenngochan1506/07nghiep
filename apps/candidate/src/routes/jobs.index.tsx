import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { JobCardItem } from "@/components/job-card";
import { SearchBar } from "@/components/search-bar";
import { JobFilters } from "@/components/job-filters";
import { useJobs } from "@/routes/__root";

export const Route = createFileRoute("/jobs/")({
    component: JobsPage,
});

const ITEMS_PER_PAGE = 4;

function JobsPage() {
    // Gọi dữ liệu từ Context thay vì mockJobs cứng
    const { jobs, toggleSave } = useJobs();

    const [keyword, setKeyword] = useState("");
    const [filters, setFilters] = useState({ location: "", workType: "" });

    // State phân trang
    const [currentPage, setCurrentPage] = useState(1);

    const handleSearch = (newKeyword: string) => {
        setKeyword(newKeyword);
        setCurrentPage(1); // Trở về trang 1 khi tìm kiếm
    };

    const filteredJobs = useMemo(() => {
        return jobs.filter((job) => {
            const matchKeyword = keyword === "" || job.title.toLowerCase().includes(keyword.toLowerCase()) || job.companyName.toLowerCase().includes(keyword.toLowerCase());
            const matchLocation = filters.location === "" || job.location.toLowerCase().includes(filters.location.toLowerCase());
            const matchWorkType = filters.workType === "" || job.workType === filters.workType;
            return matchKeyword && matchLocation && matchWorkType;
        });
    }, [keyword, filters, jobs]);

    // Logic cắt mảng để hiển thị theo trang
    const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white py-8 px-4 border-b border-gray-200">
                <div className="max-w-6xl mx-auto space-y-6">
                    <h1 className="text-3xl font-bold text-gray-900">Tìm kiếm công việc</h1>
                    <SearchBar onSearch={handleSearch} initialKeyword={keyword} />
                </div>
            </div>

            <div className="max-w-7xl mx-auto w-full px-4 py-8 flex gap-8">
                <aside className="shrink-0">
                    <JobFilters
                        filters={filters}
                        setFilters={(newFilters) => {
                            // Cập nhật bộ lọc và reset về trang 1
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
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {paginatedJobs.map((job) => (
                                    <JobCardItem
                                        key={job.id}
                                        job={job as any}
                                        onSave={toggleSave}
                                    />
                                ))}
                            </div>

                            {/* Nút điều hướng phân trang */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-4 mt-8">
                                    <button
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