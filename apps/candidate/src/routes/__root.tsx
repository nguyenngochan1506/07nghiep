import { NotFoundComponent } from "@/components/not-found";
import { Toaster } from "@07nghiep/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import type { trpc } from "@/utils/trpc";

import "../index.css";

// 1. Import thêm React Hook và dữ liệu mẫu
import { createContext, useContext, useState } from "react";
import { mockJobs } from "@/utils/mock-jobs";

// 2. Tạo Context và Hook tiện ích để các trang con có thể gọi dữ liệu
export type JobType = typeof mockJobs[0] & { isSaved?: boolean };
export const JobsContext = createContext<{
    jobs: JobType[];
    toggleSave: (id: string) => void;
} | null>(null);

export function useJobs() {
    const context = useContext(JobsContext);
    if (!context) throw new Error("useJobs must be used within RootComponent");
    return context;
}

export interface RouterAppContext {
    trpc: typeof trpc;
    queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    head: () => ({
        meta: [
            {
                title: "Tìm việc | 07nghiep",
            },
            {
                name: "description",
                content: "Cổng tìm việc 07nghiep - Tìm kiếm việc làm và ứng tuyển trực tuyến",
            },
        ],
        links: [
            {
                rel: "icon",
                href: "/favicon.ico",
            },
        ],
    }),
});

function RootComponent() {
    // Khởi tạo state quản lý danh sách công việc toàn ứng dụng
    const [jobs, setJobs] = useState<JobType[]>(mockJobs);

    // Hàm xử lý logic Lưu / Bỏ lưu
    const toggleSave = (id: string) => {
        setJobs((prev) =>
            prev.map((job) =>
                job.id === id ? { ...job, isSaved: !job.isSaved } : job
            )
        );
    };

    return (
        <>
            <HeadContent />
            <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                disableTransitionOnChange
                storageKey="vite-ui-theme"
            >
                <div className="grid grid-rows-[auto_1fr] h-svh">
                    <Header />
                    {/* 3. Truyền state qua Provider */}
                    <JobsContext.Provider value={{ jobs, toggleSave }}>
                        <Outlet />
                    </JobsContext.Provider>
                </div>
                <Toaster richColors />
            </ThemeProvider>
            <TanStackRouterDevtools position="bottom-left" />
            <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
        </>
    );
}