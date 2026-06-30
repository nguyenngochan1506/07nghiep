import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent } from "@07nghiep/ui/components/card";
import { Separator } from "@07nghiep/ui/components/separator";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { AppRouter } from "@07nghiep/server/routers/index";
import type { inferRouterOutputs } from "@trpc/server";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Globe,
  Linkedin,
  MapPin,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { LocationMap } from "@/components/location-map";
import { RichTextBlock } from "@/lib/rich-text";
import { formatSalaryRangeVnd } from "@/lib/salary";
import { type RouterAppContext } from "@/routes/__root";
import { publicQueryOptions, trpc } from "@/utils/trpc";

const JOBS_PER_PAGE = 15;

const COMPANY_SIZE_LABELS: Record<string, string> = {
  STARTUP: "Startup (1-10)",
  SMALL: "Nhỏ (11-50)",
  MEDIUM: "Vừa (51-200)",
  LARGE: "Lớn (201-1000)",
  ENTERPRISE: "Doanh nghiệp (>1000)",
};

type RouterOutputs = inferRouterOutputs<AppRouter>;
type OrganizationDetail = RouterOutputs["organization"]["getById"];
type OrganizationJob = RouterOutputs["organization"]["getJobs"]["jobs"][number];

function formatSalary(raw: OrganizationJob): string {
  return formatSalaryRangeVnd(raw.salaryMin, raw.salaryMax, raw.salaryNegotiable);
}

function normalizeExternalUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function getInitials(name: string | null | undefined) {
  return (name ?? "")
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}

import { createSeoHead, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/organizations/$orgId")({
  loader: ({ context, params }) => preloadOrganizationDetailRoute(context, params.orgId),
  head: ({ loaderData, params }) => {
    const org = loaderData as OrganizationDetail | undefined;
    const title = org?.name ? `${org.name} | 07nghiep` : "Chi tiết công ty | 07nghiep";
    const description = org
      ? `Xem thông tin ${org.name}, ngành ${org.industry ?? "đang cập nhật"} và các việc làm đang tuyển.`
      : "Xem thông tin công ty, việc làm đang tuyển và đánh giá từ ứng viên.";

    return createSeoHead({
      title,
      description,
      image: org?.logoUrl || undefined,
      url: `${SITE_URL}/organizations/${params.orgId}`,
    });
  },
  component: OrganizationDetailPage,
});

async function preloadOrganizationDetailRoute(
  context: RouterAppContext,
  orgId: string,
): Promise<OrganizationDetail> {
  const org = await context.queryClient.ensureQueryData(
    context.trpc.organization.getById.queryOptions({ id: orgId }, publicQueryOptions),
  );

  await context.queryClient.ensureQueryData(
    context.trpc.organization.getJobs.queryOptions(
      {
        organizationId: orgId,
        status: "OPEN",
        page: 1,
        pageSize: JOBS_PER_PAGE,
      },
      publicQueryOptions,
    ),
  );

  return org;
}

function OrganizationDetailPage() {
  const { orgId } = Route.useParams();
  const [currentPage, setCurrentPage] = useState(1);
  const jobsSectionRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollJobsRef = useRef(false);

  const { data: org, isLoading: orgLoading } = useQuery(
    trpc.organization.getById.queryOptions({ id: orgId }, publicQueryOptions),
  );

  const {
    data: jobsData,
    isFetching: jobsFetching,
    isLoading: jobsLoading,
  } = useQuery(
    trpc.organization.getJobs.queryOptions({
      organizationId: orgId,
      status: "OPEN",
      page: currentPage,
      pageSize: JOBS_PER_PAGE,
    }, publicQueryOptions),
  );

  const isLoading = orgLoading || jobsLoading;
  const jobs = jobsData?.jobs ?? [];
  const totalJobs = jobsData?.pagination.total ?? org?.openJobsCount ?? jobs.length;
  const totalPages = jobsData?.pagination.totalPages ?? Math.ceil(totalJobs / JOBS_PER_PAGE);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      const safePage = Math.min(Math.max(1, nextPage), Math.max(1, totalPages));
      shouldScrollJobsRef.current = true;
      setCurrentPage(safePage);
    },
    [totalPages],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [orgId]);

  useEffect(() => {
    if (!shouldScrollJobsRef.current || jobsFetching) return;

    shouldScrollJobsRef.current = false;
    jobsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [jobsFetching]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background px-4 py-8 text-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background p-4 text-foreground">
        <Building2 className="mb-4 size-16 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold text-foreground">Không tìm thấy công ty</h1>
        <p className="mb-6 text-muted-foreground">Công ty này không tồn tại hoặc đã bị xóa.</p>
        <Button asChild variant="outline">
          <a href="/organizations">Quay lại danh sách</a>
        </Button>
      </div>
    );
  }

  const initials = getInitials(org.name);
  const companyFacts = [
    {
      label: "Quy mô",
      value: org.companySize ? (COMPANY_SIZE_LABELS[org.companySize] ?? org.companySize) : null,
      icon: Users,
    },
    { label: "Ngành nghề", value: org.industry, icon: BriefcaseBusiness },
    {
      label: "Thành lập",
      value: org.foundedYear ? `${org.foundedYear}` : null,
      icon: Calendar,
    },
    { label: "Loại hình", value: org.companyType, icon: Building2 },
    { label: "Quốc gia", value: org.country, icon: MapPin },
    { label: "Ngày làm việc", value: org.workingDays, icon: Calendar },
    { label: "Tăng ca", value: org.overtimePolicy, icon: BriefcaseBusiness },
    { label: "Nguồn dữ liệu", value: org.sourceSite, icon: Globe },
  ].filter((fact) => !!fact.value);

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-8 text-foreground md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <a
          href="/organizations"
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Quay lại danh sách
        </a>

        <Card className="shadow-md shadow-primary/5">
          {org.coverImageUrl ? (
            <img
              src={org.coverImageUrl}
              alt={`Ảnh bìa ${org.name}`}
              className="h-40 w-full border-b object-cover md:h-56"
            />
          ) : null}

          <CardContent className="flex flex-col gap-6 p-6 md:p-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
                {org.logoUrl ? (
                  <img
                    src={org.logoUrl}
                    alt={org.name}
                    className="size-20 shrink-0 rounded-xl border object-contain"
                  />
                ) : (
                  <div className="flex size-20 shrink-0 items-center justify-center rounded-xl border bg-accent">
                    <span className="text-2xl font-bold text-primary">{initials}</span>
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                      {org.name}
                    </h1>
                    {org.verified ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="size-3.5" />
                        Đã xác thực
                      </Badge>
                    ) : null}
                  </div>

                  {org.industry ? (
                    <p className="mt-2 text-base text-muted-foreground">{org.industry}</p>
                  ) : null}

                  <p className="mt-3 text-sm text-muted-foreground">{totalJobs} việc đang tuyển</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {org.website ? (
                  <Button asChild variant="outline" className="h-9">
                    <a href={normalizeExternalUrl(org.website)} target="_blank" rel="noreferrer">
                      <Globe data-icon="inline-start" />
                      Website
                      <ExternalLink data-icon="inline-end" />
                    </a>
                  </Button>
                ) : null}
                {org.linkedinUrl ? (
                  <Button asChild variant="outline" className="h-9">
                    <a
                      href={normalizeExternalUrl(org.linkedinUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Linkedin data-icon="inline-start" />
                      LinkedIn
                      <ExternalLink data-icon="inline-end" />
                    </a>
                  </Button>
                ) : null}
                {org.sourceUrl ? (
                  <Button asChild variant="outline" className="h-9">
                    <a href={normalizeExternalUrl(org.sourceUrl)} target="_blank" rel="noreferrer">
                      <ExternalLink data-icon="inline-start" />
                      Nguồn
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>

            {org.location ? (
              <div className="grid items-start gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-xl border bg-surface-wash p-4 lg:min-h-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-brand-orange">
                      <MapPin className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Địa chỉ công ty
                      </p>
                      <p className="mt-1 max-w-4xl font-semibold leading-6 text-foreground">
                        {org.location}
                      </p>
                    </div>
                  </div>
                </div>
                <LocationMap
                  address={org.location}
                  title="Bản đồ công ty"
                  className="gap-0 py-0"
                  mapClassName="h-48"
                />
              </div>
            ) : null}

            {companyFacts.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {companyFacts.map((fact) => (
                  <div key={fact.label} className="rounded-xl border bg-surface-wash p-4">
                    <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-card text-brand-orange">
                      <fact.icon className="size-4" />
                    </div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      {fact.label}
                    </p>
                    <p className="mt-1 font-semibold leading-6 text-foreground">{fact.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <Separator />

            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold text-foreground">Giới thiệu</h2>
              <RichTextBlock
                text={org.description}
                fallback="Công ty chưa có giới thiệu chi tiết."
              />
            </div>
          </CardContent>
        </Card>

        <section ref={jobsSectionRef} className="scroll-mt-28">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Việc đang tuyển</h2>
              {totalJobs > 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Trang <span className="font-medium text-foreground">{currentPage}</span>
                  {totalPages > 0 ? (
                    <>
                      {" "}
                      / <span className="font-medium text-foreground">{totalPages}</span>
                    </>
                  ) : null}{" "}
                  - hiển thị <span className="font-medium text-foreground">{jobs.length}</span> /{" "}
                  <span className="font-medium text-foreground">{totalJobs}</span> việc
                </p>
              ) : null}
            </div>
          </div>

          {jobs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {jobs.map((job) => (
                <a key={job.id} href={`/jobs/${job.id}`} className="h-full">
                  <Card className="h-full cursor-pointer transition-shadow hover:border-brand-orange/50 hover:shadow-md">
                    <CardContent className="flex h-full flex-col gap-3 p-4">
                      <div className="min-w-0">
                        <h3 className="line-clamp-1 font-semibold text-foreground">{job.title}</h3>
                        {job.location ? (
                          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-surface-wash px-2.5 py-1.5 text-xs leading-5 text-secondary-foreground">
                            <MapPin className="mt-0.5 size-3.5 shrink-0" />
                            <span className="line-clamp-2 min-w-0">{job.location}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-auto flex flex-wrap gap-2">
                        {job.workType ? <Badge variant="secondary">{job.workType}</Badge> : null}
                        {job.jobType ? <Badge variant="outline">{job.jobType}</Badge> : null}
                        {job.expiresAt ? (
                          <Badge variant="outline">
                            <Calendar data-icon="inline-start" />
                            Hạn {new Intl.DateTimeFormat("vi-VN").format(new Date(job.expiresAt))}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t pt-3">
                        <span className="min-w-0 truncate font-semibold text-primary">
                          {formatSalary(job)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                          Chi tiết
                          <ChevronRight className="size-4" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              ))}

              {totalPages > 1 ? (
                <div className="mt-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || jobsFetching}
                    variant="outline"
                  >
                    Trang trước
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || jobsFetching}
                    variant="outline"
                  >
                    Trang sau
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <h3 className="mb-2 text-lg font-medium text-foreground">Chưa có việc làm nào</h3>
                <p className="text-muted-foreground">
                  Công ty này hiện chưa đăng tin tuyển dụng nào.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
      <OrganizationStructuredData org={org} totalJobs={totalJobs} />
    </div>
  );
}

function OrganizationStructuredData({
  org,
  totalJobs,
}: {
  org: OrganizationDetail;
  totalJobs: number;
}) {
  const sameAs = [org.website, org.linkedinUrl]
    .filter((value): value is string => Boolean(value))
    .map(normalizeExternalUrl);
  const organizationUrl = `${SITE_URL}/organizations/${org.id}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: org.name,
      url: organizationUrl,
      logo: org.logoUrl || undefined,
      description: org.description || undefined,
      sameAs: sameAs.length > 0 ? sameAs : undefined,
      address: org.location
        ? {
            "@type": "PostalAddress",
            streetAddress: org.location,
            addressCountry: org.country || "VN",
          }
        : undefined,
      foundingDate: org.foundedYear ? `${org.foundedYear}-01-01` : undefined,
      knowsAbout: org.industry || undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "07nghiep",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Công ty",
          item: `${SITE_URL}/organizations`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: org.name,
          item: organizationUrl,
        },
      ],
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
