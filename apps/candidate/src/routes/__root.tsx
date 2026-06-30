import { Toaster } from "@07nghiep/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import Header from "@/components/header";
import { NotFoundComponent } from "@/components/not-found";
import { ThemeProvider } from "@/components/theme-provider";
import { formatSalaryRangeVnd } from "@/lib/salary";
import { publicQueryOptions, trpc } from "@/utils/trpc";

import appCss from "../index.css?url";

import { useQuery } from "@tanstack/react-query";
import { createContext, lazy, Suspense, useContext, useMemo } from "react";

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-router-devtools").then((module) => ({
        default: module.TanStackRouterDevtools,
      })),
    )
  : null;

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((module) => ({
        default: module.ReactQueryDevtools,
      })),
    )
  : null;

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

export type PublicJob = {
  id: string;
  title: string;
  location: string | null;
  workType: string | null;
  jobType: string | null;
  experienceLevel: string | null;
  salaryMin: string | number | null;
  salaryMax: string | number | null;
  skills: string[];
  createdAt: string | Date;
  expiresAt: string | null;
  views: number | null;
  organization?: {
    name: string | null;
    logoUrl: string | null;
    verified: boolean | null;
  } | null;
};
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
    experience: raw.experienceLevel ?? "",
    salaryRange,
    skills: raw.skills ?? [],
    postedDate,
    expiresAt: raw.expiresAt ?? null,
    viewCount: raw.views ?? 0,
  };
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  beforeLoad: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      context.trpc.job.getPublicList.queryOptions(
        { limit: PUBLIC_JOBS_PREVIEW_LIMIT },
        publicQueryOptions,
      ),
    );
  },
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  head: () => ({
    meta: [
      {
        title: "07nghiep - Tìm việc làm phù hợp, ứng tuyển nhanh tại Việt Nam",
      },
      {
        name: "description",
        content:
          "07nghiep giúp ứng viên tìm việc, so sánh công ty, lưu cơ hội phù hợp và theo dõi ứng tuyển trong một workspace rõ ràng.",
      },
    ],
    links: [
      { rel: "icon", href: "/07logo.png" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
});

function RootComponent() {
  const location = useLocation();
  const { data, isLoading, isError } = useQuery(
    trpc.job.getPublicList.queryOptions(
      { limit: PUBLIC_JOBS_PREVIEW_LIMIT },
      publicQueryOptions,
    ),
  );

  const publicJobsData = data as { jobs?: PublicJob[] } | undefined;
  const publicJobs = publicJobsData?.jobs ?? [];
  const jobs: JobType[] = useMemo(() => publicJobs.map((job) => mapJob(job)), [publicJobs]);
  const isOAuthPopupCallback = location.pathname === "/auth/google/callback";

  return (
    <RootDocument>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <div className="grid min-h-svh grid-rows-[auto_1fr] bg-background text-foreground">
          {isOAuthPopupCallback ? null : (
            <>
              <Header />
            </>
          )}
          <JobsContext.Provider value={{ jobs, isLoading, isError }}>
            <Outlet />
          </JobsContext.Provider>
        </div>
        <Toaster richColors />
      </ThemeProvider>
      {TanStackRouterDevtools && ReactQueryDevtools ? (
        <Suspense fallback={null}>
          <TanStackRouterDevtools position="bottom-left" />
          <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
        </Suspense>
      ) : null}
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
