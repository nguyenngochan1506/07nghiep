import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { JobCard } from "@/components/job-card";
import { SearchBar } from "@/components/search-bar";
import { JobFilters } from "@/components/job-filters";
import { mockJobs } from "@/utils/mock-jobs";
export const Route = createFileRoute("/jobs")({
    component: JobsPage,
});

function JobsPage() {
    // Trạng thái lưu từ khóa tìm kiếm
    const [keyword, setKeyword] = useState("");

    // Trạng thái lưu các tùy chọn của bộ lọc bên trái
    const [filters, setFilters] = useState({
        location: "",
        workType: "",
    });

    // Hàm cập nhật từ khóa khi người dùng nhập vào SearchBar
    const handleSearch = (newKeyword: string) => {
        setKeyword(newKeyword);
    };

    // Logic lọc danh sách công việc dựa trên keyword và filters
    const filteredJobs = useMemo(() => {
        return mockJobs.filter((job) => {
            // 1. Kiểm tra từ khóa
            const matchKeyword =
                keyword === "" ||
                job.title.toLowerCase().includes(keyword.toLowerCase()) ||
                job.companyName.toLowerCase().includes(keyword.toLowerCase());

            // 2. Kiểm tra địa điểm
            const matchLocation =
                filters.location === "" ||
                job.location.toLowerCase().includes(filters.location.toLowerCase());

            // 3. Kiểm tra hình thức làm việc
            const matchWorkType =
                filters.workType === "" || job.workType === filters.workType;

            // Giữ lại công việc nếu thỏa mãn tất cả điều kiện
            return matchKeyword && matchLocation && matchWorkType;
        });
    }, [keyword, filters]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Phần đầu: Tiêu đề và Thanh tìm kiếm */}
            <div className="bg-white py-8 px-4 border-b border-gray-200">
                <div className="max-w-6xl mx-auto space-y-6">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Tìm kiếm công việc
                    </h1>
                    <SearchBar onSearch={handleSearch} initialKeyword={keyword} />
                </div>
            </div>

            {/* Phần thân: Bố cục 2 cột (Bộ lọc và Danh sách) */}
            <div className="max-w-7xl mx-auto w-full px-4 py-8 flex gap-8">

                {/* Cột trái: Bộ lọc */}
                <aside className="shrink-0">
                    <JobFilters filters={filters} setFilters={setFilters} />
                </aside>

                {/* Cột phải: Kết quả tìm kiếm */}
                <main className="flex-1 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-700">
                            Tìm thấy {filteredJobs.length} công việc
                        </h2>
                    </div>

                    {filteredJobs.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredJobs.map((job) => (
                                <JobCard key={job.id} job={job} />
                            ))}
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