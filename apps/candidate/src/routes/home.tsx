import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { FormEvent } from "react";

import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@07nghiep/ui/components/card";
import { Input } from "@07nghiep/ui/components/input";
import { Label } from "@07nghiep/ui/components/label";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { type JobType, useJobs } from "@/routes/__root";

export const Route = createFileRoute("/home")({
  component: HomeComponent,
});

const POPULAR_SEARCHES = ["React", "Product Designer", "Remote", "Data Analyst", "Marketing"];

const JOURNEY_STEPS = [
  {
    title: "Tìm đúng vai trò",
    description: "Lọc theo kỹ năng, địa điểm và hình thức làm việc ngay từ lần tìm đầu tiên.",
    icon: Search,
  },
  {
    title: "So sánh công ty",
    description: "Xem vị trí đang tuyển, hồ sơ công ty và mức độ xác thực trước khi ứng tuyển.",
    icon: Building2,
  },
  {
    title: "Theo dõi hồ sơ",
    description: "Quản lý đơn đã nộp, lịch phỏng vấn và tin nhắn trong cùng một tài khoản.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Ứng tuyển tự tin",
    description: "Ưu tiên việc có thông tin rõ ràng để bạn ra quyết định nhanh hơn.",
    icon: ShieldCheck,
  },
];

const WORK_MODES = ["Remote", "Hybrid", "Onsite"];

function HomeComponent() {
  const navigate = useNavigate({ from: "/home" });
  const { jobs, isLoading, isError } = useJobs();

  const featuredJobs = useMemo(() => jobs.slice(0, 4), [jobs]);
  const companyCount = useMemo(
    () => new Set(jobs.map((job) => job.companyName).filter(Boolean)).size,
    [jobs],
  );
  const visibleSkills = useMemo(
    () => Array.from(new Set(jobs.flatMap((job) => job.skills))).slice(0, 8),
    [jobs],
  );

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const openJobsLabel = isLoading
    ? "Đang tải"
    : jobs.length > 0
      ? `${jobs.length} việc đang mở`
      : "Đang cập nhật việc";
  const companyLabel = companyCount > 0 ? `${companyCount} công ty` : "Hồ sơ công ty";

  const handleSearchSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    navigate({
      to: "/jobs",
      search: {
        keyword: keyword || undefined,
        location: location || undefined,
      },
    });
  };

  const handleTagClick = (tag: string) => {
    navigate({
      to: "/jobs",
      search: {
        keyword: tag,
      },
    });
  };

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <section className="px-4 pb-16 pt-10 md:pb-20 md:pt-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 md:grid-cols-[1.02fr_0.98fr]">
          <div className="flex flex-col gap-7">
            <div className="flex w-fit items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <Sparkles className="size-3.5" />
              Việc làm đã sẵn sàng để ứng tuyển
            </div>

            <div className="flex max-w-3xl flex-col gap-5">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground md:text-6xl md:leading-[1.02]">
                Tìm việc phù hợp nhanh hơn.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                07nghiep gom việc mới, công ty và trạng thái ứng tuyển vào một nơi dễ kiểm soát.
              </p>
            </div>

            <form
              className="grid gap-3 rounded-2xl border bg-card p-3 shadow-sm md:grid-cols-[1fr_0.7fr_auto]"
              onSubmit={handleSearchSubmit}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="home-keyword">Từ khóa</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="home-keyword"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="React, marketing, designer"
                    className="h-11 pl-9"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="home-location">Địa điểm</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="home-location"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="TP.HCM, Hà Nội, Remote"
                    className="h-11 pl-9"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <Button type="submit" size="lg" className="h-11 w-full md:w-auto">
                  <Search data-icon="inline-start" />
                  Tìm việc
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((tag) => (
                <Button
                  key={tag}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleTagClick(tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[0.78fr_1fr]">
            <div className="order-2 flex flex-col gap-4 md:order-1 md:pt-20">
              <Card>
                <CardHeader>
                  <CardTitle>{openJobsLabel}</CardTitle>
                  <CardDescription>Cập nhật từ hệ thống tuyển dụng hiện tại.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {WORK_MODES.map((mode) => (
                    <Badge key={mode} variant="secondary">
                      {mode}
                    </Badge>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-primary text-primary-foreground">
                <CardHeader>
                  <CardTitle>{companyLabel}</CardTitle>
                  <CardDescription className="text-primary-foreground/80">
                    Khám phá nhà tuyển dụng trước khi gửi hồ sơ.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="order-1 overflow-hidden rounded-2xl border bg-card shadow-sm md:order-2">
              <img
                src="/images/candidate-home/hero.webp"
                alt="Ứng viên đang xem cơ hội việc làm trên máy tính"
                className="aspect-[4/5] h-full w-full object-cover"
                loading="eager"
                width={1200}
                height={900}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto flex max-w-7xl flex-col gap-7">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Việc mới đáng xem hôm nay
            </h2>
            <p className="text-muted-foreground">
              Ưu tiên các tin có mức lương, kỹ năng và vị trí rõ ràng để bạn so sánh nhanh.
            </p>
          </div>

          {isLoading ? (
            <JobSkeletonGrid />
          ) : isError ? (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle>Không tải được danh sách việc</CardTitle>
                <CardDescription>
                  Vui lòng thử lại sau hoặc mở trang việc làm để xem thêm.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link to="/jobs">Mở trang việc làm</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : featuredJobs.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <FeaturedJobCard job={featuredJobs[0]} featured />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {featuredJobs.slice(1).map((job) => (
                  <FeaturedJobCard key={job.id} job={job} />
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Chưa có việc làm nào được đăng</CardTitle>
                <CardDescription>
                  Khi nhà tuyển dụng đăng tin mới, các vị trí phù hợp sẽ xuất hiện tại đây.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <div>
            <Button asChild variant="outline" size="lg">
              <Link to="/jobs">
                Xem tất cả
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4 md:grid-rows-2">
          <Card className="md:col-span-2 md:row-span-2">
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl">Một luồng tìm việc gọn hơn</CardTitle>
              <CardDescription>
                Từ lúc tìm tin đến lúc theo dõi phỏng vấn, candidate không phải nhảy qua nhiều nơi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <img
                src="/images/candidate-home/career-planning.webp"
                alt="Ứng viên ghi chú kế hoạch ứng tuyển"
                className="aspect-[16/10] w-full rounded-xl object-cover"
                loading="lazy"
                width={900}
                height={620}
              />
            </CardContent>
          </Card>

          {JOURNEY_STEPS.map((item, index) => (
            <Card
              key={item.title}
              className={index === 1 ? "bg-secondary" : index === 3 ? "bg-accent" : undefined}
            >
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="size-5" />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-2xl border bg-secondary/40 p-5 md:grid-cols-[0.9fr_1.1fr] md:p-8">
          <div className="overflow-hidden rounded-xl border bg-card">
            <img
              src="/images/candidate-home/company-research.webp"
              alt="Không gian làm việc của một công ty đang tuyển dụng"
              className="aspect-[5/4] h-full w-full object-cover"
              loading="lazy"
              width={900}
              height={720}
            />
          </div>

          <div className="flex flex-col justify-center gap-6">
            <div className="flex max-w-2xl flex-col gap-3">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Xem công ty trước khi ứng tuyển
              </h2>
              <p className="text-muted-foreground">
                Hồ sơ công ty, trạng thái xác thực và danh sách việc mở giúp bạn chọn nơi phù hợp.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InsightItem
                icon={CheckCircle2}
                title="Công ty xác thực"
                text="Dễ nhận biết tin tuyển dụng đáng tin cậy."
              />
              <InsightItem
                icon={Clock3}
                title="Tin mới"
                text="Theo dõi thời điểm đăng và phản hồi kịp hơn."
              />
              <InsightItem
                icon={MapPin}
                title="Đúng địa điểm"
                text="Tách rõ remote, hybrid và onsite."
              />
              <InsightItem
                icon={BriefcaseBusiness}
                title="Hồ sơ gọn"
                text="Tất cả đơn ứng tuyển nằm trong candidate portal."
              />
            </div>

            {visibleSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {visibleSkills.map((skill) => (
                  <Badge key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 pt-10">
        <div className="mx-auto grid max-w-7xl gap-6 rounded-2xl border bg-card p-6 shadow-sm md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="text-3xl font-semibold tracking-tight">
              Bắt đầu với danh sách việc mới
            </h2>
            <p className="text-muted-foreground">
              Tìm theo kỹ năng hoặc mở toàn bộ việc làm để lưu lại những vị trí phù hợp.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <Button asChild size="lg">
              <Link to="/jobs">Tìm việc</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/organizations">Xem công ty</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeaturedJobCard({ job, featured = false }: { job: JobType; featured?: boolean }) {
  return (
    <Card className={featured ? "min-h-full" : undefined}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={`${job.companyName} logo`}
                className="size-full object-cover"
                loading="lazy"
              />
            ) : (
              <Building2 className="size-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className={featured ? "text-xl md:text-2xl" : undefined}>
              {job.title}
            </CardTitle>
            <CardDescription>{job.companyName}</CardDescription>
          </div>
          {job.isVerified ? <Badge variant="secondary">Xác thực</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <MapPin className="size-4" />
            {job.location || "Linh hoạt"}
          </span>
          <span className="flex items-center gap-2">
            <Clock3 className="size-4" />
            {job.postedDate}
          </span>
        </div>

        <div className="text-base font-semibold text-primary">{job.salaryRange}</div>

        <div className="flex flex-wrap gap-2">
          {job.skills.slice(0, featured ? 5 : 3).map((skill) => (
            <Badge key={skill} variant="outline">
              {skill}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link to="/jobs/$jobId" params={{ jobId: job.id }}>
            Xem chi tiết
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function InsightItem({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border bg-card p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function JobSkeletonGrid() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {[0, 1, 2].map((item) => (
          <Card key={item}>
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
