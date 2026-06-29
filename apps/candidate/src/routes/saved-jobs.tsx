import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Heart, Search } from "lucide-react";
import { JobCardItem } from "@/components/job-card";
import { PageHero } from "@/components/page-hero";
import { useLocalSavedJobs } from "@/lib/saved-jobs";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardTitle } from "@07nghiep/ui/components/card";

import { createSeoHead, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/saved-jobs")({
  head: () =>
    createSeoHead({
      title: "Việc đã lưu | 07nghiep",
      description: "Danh sách việc làm đã lưu - quản lý và ứng tuyển nhanh chóng.",
      url: `${SITE_URL}/saved-jobs`,
    }),
  component: SavedJobsPage,
});

function SavedJobsPage() {
  const localSavedJobs = useLocalSavedJobs();
  const savedJobs = localSavedJobs.savedJobs;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <PageHero
        image="saved"
        eyebrow={
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-orange/30 bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
            <Heart className="size-4" />
            Danh sách quan tâm
          </p>
        }
        title="Việc làm đã lưu"
        description="Lưu lại những vị trí phù hợp để so sánh, quay lại đọc kỹ và ứng tuyển khi sẵn sàng."
      />

      <main className="container mx-auto max-w-7xl px-4 py-8 md:px-6">
        {savedJobs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {savedJobs.map((job) => (
              <JobCardItem
                key={job.id}
                job={job}
                onSave={(jobId) => {
                  const targetJob = savedJobs.find((item) => item.id === jobId);
                  if (targetJob) localSavedJobs.toggleSavedJob(targetJob);
                }}
              />
            ))}
          </div>
        ) : (
          <SavedJobsEmptyState
            title="Chưa có công việc nào được lưu"
            description="Bạn có thể lưu việc trên thiết bị này trước, sau đó đăng nhập để đồng bộ vào tài khoản."
            actionLabel="Khám phá việc làm"
            actionTo="/jobs"
          />
        )}
      </main>
    </div>
  );
}

function SavedJobsEmptyState({
  title,
  description,
  actionLabel,
  actionTo,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionTo: "/jobs" | "/login";
}) {
  return (
    <Card className="mx-auto w-full max-w-3xl border-dashed bg-card/80">
      <CardContent className="flex flex-col items-center gap-6 px-6 py-12 text-center md:px-12 md:py-14">
        <div className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Heart className="size-7" />
        </div>
        <div className="flex max-w-xl flex-col gap-2">
          <CardTitle className="text-xl font-semibold md:text-2xl">{title}</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground md:text-base">{description}</p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button
            asChild
            className="bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90"
          >
            <a href={actionTo}>
              {actionLabel}
              <ArrowRight data-icon="inline-end" />
            </a>
          </Button>
          {actionTo === "/jobs" ? (
            <Button asChild variant="outline">
              <a href="/jobs">
                <Search data-icon="inline-start" />
                Tìm theo bộ lọc
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
