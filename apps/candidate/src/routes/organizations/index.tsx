import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent } from "@07nghiep/ui/components/card";
import { Input } from "@07nghiep/ui/components/input";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, CheckCircle2, ChevronRight, MapPin, Search, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { trpc } from "@/utils/trpc";

const ITEMS_PER_PAGE = 15;

const COMPANY_SIZE_LABELS: Record<string, string> = {
  STARTUP: "Startup (1-10)",
  SMALL: "Nhỏ (11-50)",
  MEDIUM: "Vừa (51-200)",
  LARGE: "Lớn (201-1000)",
  ENTERPRISE: "Doanh nghiệp (>1000)",
};

type PublicOrganization = {
  id: string;
  name: string;
  logoUrl: string | null;
  verified: boolean;
  industry: string | null;
  location: string | null;
  companySize: string | null;
  openJobsCount: number;
};

export const Route = createFileRoute("/organizations/")({
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const resultsTopRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollResultsRef = useRef(false);

  const { data, isFetching, isLoading } = useQuery(
    trpc.organization.getPublicList.queryOptions({
      keyword: keyword || undefined,
      limit: ITEMS_PER_PAGE,
      offset: (currentPage - 1) * ITEMS_PER_PAGE,
    }),
  );

  const organizations = (data?.organizations ?? []) as unknown as PublicOrganization[];
  const totalOrganizations = data?.total ?? organizations.length;
  const totalPages = Math.ceil(totalOrganizations / ITEMS_PER_PAGE);
  const handlePageChange = useCallback(
    (nextPage: number) => {
      const safePage = Math.min(Math.max(1, nextPage), Math.max(1, totalPages));
      shouldScrollResultsRef.current = true;
      setCurrentPage(safePage);
    },
    [totalPages],
  );

  useEffect(() => {
    if (!shouldScrollResultsRef.current || isFetching) return;

    shouldScrollResultsRef.current = false;
    resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isFetching]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="border-b bg-surface-wash px-4 py-12 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Công ty
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Khám phá các công ty hàng đầu và cơ hội việc làm từ họ
            </p>
          </div>

          <div className="mx-auto max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm công ty theo tên..."
                className="pl-10"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div ref={resultsTopRef} className="mx-auto max-w-6xl scroll-mt-28 px-4 py-8">
        {!isLoading && organizations.length > 0 ? (
          <div className="mb-4 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            Trang <span className="font-medium text-foreground">{currentPage}</span>
            {totalPages > 0 ? (
              <>
                {" "}
                / <span className="font-medium text-foreground">{totalPages}</span>
              </>
            ) : null}{" "}
            - hiển thị <span className="font-medium text-foreground">{organizations.length}</span> /{" "}
            <span className="font-medium text-foreground">{totalOrganizations}</span> công ty
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : organizations.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => {
              const initials = (org.name ?? "")
                .split(" ")
                .slice(0, 2)
                .map((w: string) => w[0] ?? "")
                .join("")
                .toUpperCase();

              return (
                <Link key={org.id} to="/organizations/$orgId" params={{ orgId: org.id }}>
                  <Card className="h-full cursor-pointer transition-shadow hover:border-brand-orange/50 hover:shadow-md">
                    <CardContent className="flex h-full flex-col gap-4 p-6">
                      <div className="flex items-start gap-4">
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.name}
                            className="size-12 shrink-0 rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent">
                            <span className="text-sm font-bold text-primary">{initials}</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="flex items-start gap-1.5 font-semibold leading-snug text-foreground">
                            <span className="line-clamp-2 min-w-0">{org.name}</span>
                            {org.verified && (
                              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                            )}
                          </h3>
                          {org.industry && (
                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                              {org.industry}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                        {org.location ? (
                          <div className="flex items-start gap-1.5 rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
                            <MapPin className="mt-0.5 size-3 shrink-0" />
                            <span className="line-clamp-2 min-w-0 leading-5">{org.location}</span>
                          </div>
                        ) : null}
                        {org.companySize && (
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">
                              <Users data-icon="inline-start" />
                              {COMPANY_SIZE_LABELS[org.companySize] ?? org.companySize}
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t pt-3">
                        <span className="text-sm font-medium text-primary">
                          {org.openJobsCount} việc đang tuyển
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
            {totalPages > 1 ? (
              <div className="col-span-full mt-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                >
                  Trang trước
                </Button>
                <span className="text-sm font-medium text-muted-foreground">
                  Trang {currentPage} / {totalPages}
                </span>
                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                >
                  Trang sau
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="py-16 text-center">
            <Building2 className="mx-auto mb-4 size-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium text-foreground">Không tìm thấy công ty</h3>
            <p className="text-muted-foreground">
              {keyword
                ? `Không có công ty nào khớp với "${keyword}"`
                : "Chưa có công ty nào đăng ký"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
