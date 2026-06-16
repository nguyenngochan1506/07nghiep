import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Search,
  Building2,
  MapPin,
  Users,
  ChevronRight,
  BadgeCheck,
  Briefcase,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Input } from "@07nghiep/ui/components/input";
import { Badge } from "@07nghiep/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardAction,
} from "@07nghiep/ui/components/card";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@07nghiep/ui/components/avatar";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { Separator } from "@07nghiep/ui/components/separator";

const COMPANY_SIZE_LABELS: Record<string, string> = {
  STARTUP: "Startup (1-10)",
  SMALL: "Nhỏ (11-50)",
  MEDIUM: "Vừa (51-200)",
  LARGE: "Lớn (201-1000)",
  ENTERPRISE: "Doanh nghiệp (>1000)",
};

export const Route = createFileRoute("/organizations/")(
  {
    component: OrganizationsPage,
  }
);

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
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="border-b bg-card py-12 px-4 md:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Công ty
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Khám phá các công ty hàng đầu và cơ hội việc làm từ họ
            </p>
          </div>

          <div className="max-w-xl mx-auto">
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

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                      <Skeleton className="h-3 w-1/2 rounded-md" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                </CardContent>
              </Card>
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
                  <Card className="h-full transition-all duration-200 hover:shadow-md cursor-pointer group/org-card">
                    <CardHeader>
                      {/* Avatar + Name */}
                      <div className="flex items-start gap-3">
                        <Avatar className="size-10 rounded-xl">
                          {org.logoUrl ? (
                            <AvatarImage
                              src={org.logoUrl}
                              alt={org.name}
                              className="rounded-xl"
                            />
                          ) : null}
                          <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xs font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-semibold text-foreground truncate">
                              {org.name}
                            </h3>
                            {org.verified && (
                              <BadgeCheck className="size-4 shrink-0 text-primary" />
                            )}
                          </div>
                          {org.industry && (
                            <p className="text-xs text-muted-foreground truncate">
                              {org.industry}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Chevron (top-right) */}
                      <CardAction>
                        <ChevronRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover/org-card:translate-x-0.5" />
                      </CardAction>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {/* Meta badges */}
                      <div className="flex flex-wrap gap-1.5">
                        {org.location && (
                          <Badge variant="secondary" className="gap-1 font-normal">
                            <MapPin className="size-3" />
                            {org.location}
                          </Badge>
                        )}
                        {org.companySize && (
                          <Badge variant="secondary" className="gap-1 font-normal">
                            <Users className="size-3" />
                            {COMPANY_SIZE_LABELS[org.companySize] ?? org.companySize}
                          </Badge>
                        )}
                      </div>

                      {/* Open jobs count */}
                      <Separator />
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="size-3.5 text-primary" />
                        <span className="text-xs font-medium text-primary">
                          {org.openJobsCount} việc đang tuyển
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-16">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted mb-4">
              <Building2 className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">
              Không tìm thấy công ty
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
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
