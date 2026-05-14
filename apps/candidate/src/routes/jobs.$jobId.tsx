import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import ApplyJobModal from "@/components/jobs/ApplyJobModal";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/jobs/$jobId")({
  component: JobDetailPage,
});

function JobDetailPage() {
  const { jobId } = Route.useParams();
  // ⚠️ TẠM THỜI MOCK DATA VÌ BACKEND CHƯA CÓ API LẤY CHI TIẾT JOB
  const job = useMemo(
    () => ({
      id: jobId,
      status: "OPEN",
      title: `Công việc ${jobId}`,
      description: "Đây là công việc test luồng Apply. Chào mừng bạn!",
    }),
    [jobId],
  );

  // Query whether current user has already applied to this job
  const hasAppliedQuery = useQuery(
    trpc.applications.list.queryOptions({ search: undefined }),
  );

  // Query whether profile is complete (use server helper)
  const profileQuery = useQuery(trpc.profile.getMyProfile.queryOptions());

  const isLoadingTrigger = hasAppliedQuery.isLoading || profileQuery.isLoading;

  const hasApplied = useMemo(() => {
    if (hasAppliedQuery.data == null) return false;
    // list returns array, check if any application for this jobId exists
    return (hasAppliedQuery.data as any[]).some((a) => a.job?.id === jobId);
  }, [hasAppliedQuery.data, jobId]);

  const applicationStatus = useMemo(() => {
    if (hasAppliedQuery.data == null) return null;
    const app = (hasAppliedQuery.data as any[]).find((a) => a.job?.id === jobId);
    return app?.status ?? null;
  }, [hasAppliedQuery.data, jobId]);

  const isProfileComplete = useMemo(() => {
      const p = profileQuery.data as any | undefined;
      if (!p) return false;
      // Per requirements: profile must have summary AND resume to be considered complete
      return Boolean(p.summary && p.resumeUrl);
  }, [profileQuery.data]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <h1 className="text-2xl font-bold mb-2">{job.title}</h1>
        <p className="text-gray-600 mb-6">{job.description}</p>

        <div className="flex gap-4 items-center">
          {isLoadingTrigger ? (
            <Skeleton className="h-10 w-40" />
          ) : (
            <ApplyJobModal
              jobId={jobId!}
              jobStatus={job.status}
              hasApplied={hasApplied}
              isProfileComplete={isProfileComplete}
              applicationStatus={applicationStatus}
            />
          )}

          <button className="border px-6 py-2 rounded-md font-medium hover:bg-gray-50">
            Lưu tin
          </button>
          <button className="border px-6 py-2 rounded-md font-medium hover:bg-gray-50">
            Chia sẻ
          </button>
        </div>
      </div>
    </div>
  );
}
