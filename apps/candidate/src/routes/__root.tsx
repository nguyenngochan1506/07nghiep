import { Toaster } from "@07nghiep/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, HeadContent, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import Header from "@/components/header";
import { authClient } from "@/lib/auth-client";
import { useSyncLocalSavedJobs } from "@/lib/saved-jobs";
import { NotFoundComponent } from "@/components/not-found";
import { ThemeProvider } from "@/components/theme-provider";
import { formatSalaryRangeVnd } from "@/lib/salary";
import { trpc } from "@/utils/trpc";

import "../index.css";

import type { AppRouter } from "@07nghiep/server/routers/index";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { createContext, useContext, useMemo } from "react";

export type JobType = {
  id: string;
  companyName: string;
  companyLogo: string;
  isVerified: boolean;
  title: string;
  location: string;
  workType: string;
  jobType: string;
  experience: string;
  salaryRange: string;
  skills: string[];
  postedDate: string;
  expiresAt: string | null;
  viewCount: number;
  isSaved?: boolean;
};

export const JobsContext = createContext<{
  jobs: JobType[];
  isLoading: boolean;
  isError: boolean;
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

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PublicJob = RouterOutputs["job"]["getPublicList"]["jobs"][number];
const PUBLIC_JOBS_PREVIEW_LIMIT = 15;

export function mapJob(raw: PublicJob): JobType {
  const salaryRange = formatSalaryRangeVnd(raw.salaryMin, raw.salaryMax);

  const postedAt = new Date(raw.createdAt);
  const now = new Date();
  const diffMs = now.getTime() - postedAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const postedDate =
    diffDays === 0
      ? "Hôm nay"
      : diffDays === 1
        ? "1 ngày trước"
        : diffDays < 30
          ? `${diffDays} ngày trước`
          : `${Math.floor(diffDays / 30)} tháng trước`;

  return {
    id: raw.id,
    companyName: raw.organization?.name ?? "Unknown",
    companyLogo: raw.organization?.logoUrl ?? "",
    isVerified: raw.organization?.verified ?? false,
    title: raw.title,
    location: raw.location ?? "",
    workType: raw.workType ?? "",
    jobType: raw.jobType ?? "",
    experience: raw.experience ?? "",
    salaryRange,
    skills: raw.skills ?? [],
    postedDate,
    expiresAt: raw.expiresAt ?? null,
    viewCount: raw.views ?? 0,
  };
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
        href: "/07logo.png",
      },
    ],
  }),
});

function RootComponent() {
  const { data, isLoading, isError } = useQuery(
    trpc.job.getPublicList.queryOptions({ limit: PUBLIC_JOBS_PREVIEW_LIMIT }),
  );

  const jobs: JobType[] = useMemo(() => {
    if (!data?.jobs) return [];
    return data.jobs.map((job) => mapJob(job));
  }, [data]);

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <div className="grid min-h-svh grid-rows-[auto_1fr] bg-background text-foreground">
          <SavedJobsSyncGate />
          <Header />
          <JobsContext.Provider value={{ jobs, isLoading, isError }}>
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

function SavedJobsSyncGate() {
  const { data: session } = authClient.useSession();

  useSyncLocalSavedJobs(Boolean(session?.user?.id));

  return null;
}
