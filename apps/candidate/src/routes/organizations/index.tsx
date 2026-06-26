import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { AppRouter } from "@07nghiep/server/routers/index";
import type { inferRouterOutputs } from "@trpc/server";
import { Search, Building2, MapPin, Users, ChevronRight, CheckCircle2 } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Input } from "@07nghiep/ui/components/input";
import { Card, CardContent } from "@07nghiep/ui/components/card";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { Badge } from "@07nghiep/ui/components/badge";

const COMPANY_SIZE_LABELS: Record<string, string> = {
  STARTUP: "Startup (1-10)",
  SMALL: "Nhỏ (11-50)",
  MEDIUM: "Vừa (51-200)",
  LARGE: "Lớn (201-1000)",
  ENTERPRISE: "Doanh nghiệp (>1000)",
};

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PublicOrganization = RouterOutputs["organization"]["getPublicList"]["organizations"][number];

export const Route = createFileRoute("/organizations/")({
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const [keyword, setKeyword] = useState("");

  const { data, isLoading } = useQuery(
    trpc.organization.getPublicList.queryOptions({
      keyword: keyword || undefined,
      limit: 30,
    }),
  );

  const organizations = data?.organizations ?? [];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="border-b bg-secondary/30 px-4 py-12 md:px-8">
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
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : organizations.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org: PublicOrganization) => {
              const initials = (org.name ?? "")
                .split(" ")
                .slice(0, 2)
                .map((w: string) => w[0] ?? "")
                .join("")
                .toUpperCase();

              return (
                <Link key={org.id} to="/organizations/$orgId" params={{ orgId: org.id }}>
                  <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-col gap-3 p-6">
                      <div className="flex items-start gap-4">
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.name}
                            className="size-12 shrink-0 rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <span className="text-sm font-bold text-primary">{initials}</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="flex items-center gap-1.5 truncate font-semibold text-foreground">
                            {org.name}
                            {org.verified && (
                              <CheckCircle2 className="size-4 shrink-0 text-primary" />
                            )}
                          </h3>
                          {org.industry && (
                            <p className="text-sm text-muted-foreground">{org.industry}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {org.location && (
                          <Badge variant="secondary">
                            <MapPin data-icon="inline-start" />
                            {org.location}
                          </Badge>
                        )}
                        {org.companySize && (
                          <Badge variant="secondary">
                            <Users data-icon="inline-start" />
                            {COMPANY_SIZE_LABELS[org.companySize] ?? org.companySize}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1 flex items-center justify-between border-t pt-3">
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
