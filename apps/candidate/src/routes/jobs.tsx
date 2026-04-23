import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { JobCard } from "../components/job-card";
import { SearchBar } from "../components/search-bar";
import { mockJobs } from "../utils/mock-jobs";

// Cấu hình Route cho TanStack Router
export const Route = createFileRoute("/jobs")({
    component: JobsPage,
});

function JobsPage() {
    // State lưu trữ từ khóa tìm kiếm
    const [keyword, setKeyword] = useState("");
    const [location, setLocation] = useState("");

    // Hàm nhận dữ liệu từ SearchBar
    const handleSearch = (newKeyword: string, newLocation: string) => {
        setKeyword(newKeyword);
        setLocation(newLocation);
    };

    // Logic lọc danh sách công việc dựa trên từ khóa và địa điểm (phân biệt chữ hoa/thường)
    const filteredJobs = useMemo(() => {
        return mockJobs.filter((job) => {
            const matchKeyword =
                keyword === "" ||
                job.title.toLowerCase().includes(keyword.toLowerCase()) ||
                job.companyName.toLowerCase().includes(keyword.toLowerCase());

            const matchLocation =
                location === "" ||
                job.location.toLowerCase().includes(location.toLowerCase());

            return matchKeyword && matchLocation;
        });
    }, [keyword, location]);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* --- PHẦN HEADER & THANH TÌM KIẾM --- */}
            <div className="bg-primary/5 py-12 px-4 md:px-8 border-b border-border">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="text-center space-y-3">
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
                            Find Your Dream Job
                        </h1>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            Explore thousands of job opportunities matching your skills, location, and experience level.
                        </p>
                    </div>

                    {/* Nhúng SearchBar vào đây */}
                    <SearchBar onSearch={handleSearch} />
                </div>
            </div>

            {/* --- PHẦN NỘI DUNG CHÍNH (LAYOUT 2 CỘT) --- */}
            <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8 flex flex-col lg:flex-row gap-8">

                {/* Cột trái: Sidebar chứa Bộ lọc (Tạm thời để khung trống) */}
                <aside className="w-full lg:w-1/4 shrink-0">
                    <div className="bg-card border border-border rounded-xl p-6 h-[400px] flex flex-col items-center justify-center text-muted-foreground border-dashed">
                        <span className="font-medium text-foreground mb-2">Filters</span>
                        <p className="text-sm text-center">Chúng ta sẽ code component &lt;JobFilters /&gt; và nhúng vào đây ở bước sau</p>
                    </div>
                </aside>

                {/* Cột phải: Danh sách công việc */}
                <main className="flex-1 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-foreground">
                            {filteredJobs.length} {filteredJobs.length === 1 ? "Job" : "Jobs"} Found
                        </h2>
                    </div>

                    {filteredJobs.length > 0 ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {filteredJobs.map((job) => (
                                <JobCard key={job.id} job={job} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
                            <p className="text-lg font-medium text-foreground">No jobs found</p>
                            <p className="text-muted-foreground mt-1">Try adjusting your search keywords or location.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}