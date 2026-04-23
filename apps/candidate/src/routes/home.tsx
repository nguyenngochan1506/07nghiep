import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Briefcase, Building2, Users, ArrowRight } from "lucide-react";

import { Button } from "@07nghiep/ui/components/button";
import { Card } from "@07nghiep/ui/components/card";
import { Input } from "@07nghiep/ui/components/input";

export const Route = createFileRoute("/home")({
    component: HomeComponent,
});

const FEATURED_JOBS = [
    {
        id: 1,
        title: "Senior Frontend Developer",
        company: "TechCorp Vietnam",
        location: "Ho Chi Minh City",
        salary: "$2,500 - $4,000",
        tags: ["React", "TypeScript", "Remote"],
    },
    {
        id: 2,
        title: "Backend Engineer",
        company: "DataFlow Systems",
        location: "Hanoi",
        salary: "$2,000 - $3,500",
        tags: ["Node.js", "PostgreSQL", "AWS"],
    },
    {
        id: 3,
        title: "UI/UX Designer",
        company: "Creative Studio",
        location: "Da Nang",
        salary: "$1,500 - $2,500",
        tags: ["Figma", "Design System", "Mobile"],
    },
];

const QUICK_LINKS = [
    { icon: Briefcase, label: "Tìm việc", href: "/jobs" }, // Cập nhật href trỏ về /jobs
    { icon: Building2, label: "Công ty", href: "/" },
    { icon: Users, label: "Đơn ứng tuyển", href: "/" },
];

function HomeComponent() {
    // 1. Khởi tạo Hook điều hướng của TanStack Router
    const navigate = useNavigate({ from: "/home" });

    // 2. Tạo State để lưu trữ dữ liệu người dùng gõ vào
    const [keyword, setKeyword] = useState("");
    const [location, setLocation] = useState("");

    // 3. Hàm xử lý khi bấm nút "Tìm kiếm"
    const handleSearchSubmit = () => {
        // Điều hướng sang trang /jobs và đính kèm từ khóa lên thanh URL (Query Parameters)
        navigate({
            to: "/jobs",
            search: {
                keyword: keyword || undefined,
                location: location || undefined,
            },
        });
    };

    // 4. Hàm xử lý khi bấm vào các Tag gợi ý (Popular Searches)
    const handleTagClick = (tag: string) => {
        navigate({
            to: "/jobs",
            search: {
                keyword: tag,
            },
        });
    };

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="bg-secondary/30 px-4 py-16 md:py-24">
                <div className="container mx-auto max-w-4xl text-center">
                    <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
                        Cục shit trôi sông...
                    </h1>
                    <p className="mb-8 text-lg text-muted-foreground">
                        Khám phá hàng ngàn cục shit từ các công ty hàng đầu Việt Nam...
                    </p>

                    {/* Search Bar (Đã tích hợp Logic) */}
                    <div className="mx-auto max-w-2xl">
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Tìm việc theo từ khóa..."
                                    className="pl-10"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()} // Cho phép bấm Enter để tìm
                                />
                            </div>
                            <div className="relative flex-1 sm:flex-none sm:w-48">
                                <Input
                                    placeholder="Địa điểm"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                                />
                            </div>
                            <Button className="gap-2" onClick={handleSearchSubmit}>
                                <Search className="h-4 w-4" />
                                Tìm kiếm
                            </Button>
                        </div>
                    </div>

                    {/* Popular Searches (Đã tích hợp click tự động tìm) */}
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        {["Developer", "Designer", "Marketing", "Sales", "Suger daddy", "Suger baby"].map((tag) => (
                            <Button
                                key={tag}
                                variant="outline"
                                size="sm"
                                className="rounded-sm"
                                onClick={() => handleTagClick(tag)}
                            >
                                {tag}
                            </Button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Jobs */}
            <section className="container mx-auto max-w-6xl px-4 py-12">
                <div className="mb-8 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">Việc làm nổi bật</h2>
                    <Link
                        to="/jobs"
                        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Xem tất cả <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {FEATURED_JOBS.map((job) => (
                        <Card key={job.id} className="p-5 transition-shadow hover:shadow-md">
                            <div className="mb-3 flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold">{job.title}</h3>
                                    <p className="text-sm text-muted-foreground">{job.company}</p>
                                </div>
                                <span className="rounded-sm bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                  Mới
                </span>
                            </div>

                            <div className="mb-4 text-sm text-muted-foreground">
                                <p>{job.location}</p>
                                <p className="font-medium text-primary">{job.salary}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {job.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                                    >
                    {tag}
                  </span>
                                ))}
                            </div>

                            <Button className="mt-4 w-full" variant="outline" size="sm">
                                Ứng tuyển ngay
                            </Button>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Quick Links */}
            <section className="bg-secondary/30 px-4 py-12">
                <div className="container mx-auto max-w-4xl">
                    <h2 className="mb-6 text-center text-xl font-semibold">Liên kết nhanh</h2>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {QUICK_LINKS.map((link) => (
                            <Link
                                key={link.label}
                                to={link.href}
                                className="flex h-auto flex-col items-center gap-2 rounded-md border border-border bg-background p-6 text-center transition-colors hover:bg-muted"
                            >
                                <link.icon className="h-6 w-6 text-primary" />
                                <span className="text-sm font-medium">{link.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto max-w-4xl px-4 py-12 text-center">
                <h2 className="mb-4 text-2xl font-semibold">Bạn là nhà tuyển dụng?</h2>
                <p className="mb-6 text-muted-foreground">
                    Đăng tin tuyển dụng và tìm kiếm ứng viên phù hợp cho công ty
                </p>
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
                >
                    Đăng tin tuyển dụng
                </Link>
            </section>
        </div>
    );
}