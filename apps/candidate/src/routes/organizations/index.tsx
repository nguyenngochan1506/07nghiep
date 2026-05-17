import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Building2, MapPin, Users, ExternalLink, ChevronRight } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Input } from "@07nghiep/ui/components/input";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent } from "@07nghiep/ui/components/card";
import { Skeleton } from "@07nghiep/ui/components/skeleton";

const COMPANY_SIZE_LABELS: Record<string, string> = {
  STARTUP: "Startup (1-10)",
  SMALL: "Nhỏ (11-50)",
  MEDIUM: "Vừa (51-200)",
  LARGE: "Lớn (201-1000)",
  ENTERPRISE: "Doanh nghiệp (>1000)",
};

export const Route = createFileRoute("/organizations/")({
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const [keyword, setKeyword] = useState("");

  const { data, isLoading } = useQuery(
    trpc.organization.getPublicList.queryOptions({
      keyword: keyword || undefined,
      limit: 30,
    })
  );

  const organizations = data?.organizations ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white py-12 px-4 md:px-8 border-b border-gray-200">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Công ty
            </h1>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Khám phá các công ty hàng đầu và cơ hội việc làm từ họ
            </p>
          </div>

          <div className="max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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

      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : organizations.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org: any) => {
              const initials = (org.name ?? "")
                .split(" ")
                .slice(0, 2)
                .map((w: string) => w[0] ?? "")
                .join("")
                .toUpperCase();

              return (
                <Link
                  key={org.id}
                  to="/organizations/$orgId"
                  params={{ orgId: org.id }}
                >
                  <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
                    <CardContent className="p-6 flex flex-col gap-3">
                      <div className="flex items-start gap-4">
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.name}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">
                              {initials}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {org.name}
                            {org.verified && (
                              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-100 text-green-600 text-[10px]">
                                ✓
                              </span>
                            )}
                          </h3>
                          {org.industry && (
                            <p className="text-sm text-muted-foreground">
                              {org.industry}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {org.location && (
                          <span className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-0.5">
                            <MapPin className="h-3 w-3" />
                            {org.location}
                          </span>
                        )}
                        {org.companySize && (
                          <span className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-0.5">
                            <Users className="h-3 w-3" />
                            {COMPANY_SIZE_LABELS[org.companySize] ?? org.companySize}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-1 pt-3 border-t border-gray-100">
                        <span className="text-sm font-medium text-primary">
                          {org.openJobsCount} việc đang tuyển
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Building2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Không tìm thấy công ty
            </h3>
            <p className="text-gray-500">
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
