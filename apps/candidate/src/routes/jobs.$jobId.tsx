import { createFileRoute, Link } from "@tanstack/react-router";
import { useJobs } from "@/routes/__root";
import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import ApplyJobModal from "@/components/jobs/ApplyJobModal";
import { queryClient, trpc } from "@/utils/trpc";

type JobDetailView = {
  id: string;
  title: string;
  companyName: string;
  companyLogo: string;
  location: string;
  workType: string;
  jobType: string;
  experience: string;
  salaryRange: string;
  skills: string[];
  description: string;
  status: string;
};

type PublicJobDetail = {
  id: string;
  title: string;
  location: string | null;
  workType: string | null;
  jobType: string | null;
  experience: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  skills: string[];
  description: string | null;
  status: string;
  organization: {
    name: string | null;
    logoUrl: string | null;
  } | null;
};

function mapJob(raw: PublicJobDetail): JobDetailView {
  const salaryRange =
    raw.salaryMin && raw.salaryMax
      ? `$${raw.salaryMin.toLocaleString()} - $${raw.salaryMax.toLocaleString()}`
      : "Thỏa thuận";

  return {
    id: raw.id,
    title: raw.title,
    companyName: raw.organization?.name ?? "Unknown",
    companyLogo: raw.organization?.logoUrl ?? "",
    location: raw.location ?? "",
    workType: raw.workType ?? "",
    jobType: raw.jobType ?? "",
    experience: raw.experience ?? "",
    salaryRange,
    skills: raw.skills ?? [],
    description: raw.description ?? "",
    status: raw.status,
  };
}

export const Route = createFileRoute("/jobs/$jobId")({
  component: JobDetailPage,
});

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const { jobs } = useJobs();

  const contextJob = jobs.find((j) => j.id === jobId);

  const { data: apiJob, isLoading: apiLoading } = useQuery(
    trpc.job.getPublicById.queryOptions({ id: jobId }, { enabled: !contextJob }),
  );

  const contextJobView: JobDetailView | null = contextJob
    ? {
        ...contextJob,
        description: "",
        status: "OPEN",
      }
    : null;

  const job: JobDetailView | null =
    contextJobView ?? (apiJob ? mapJob(apiJob as unknown as PublicJobDetail) : null);

  const hasAppliedQuery = useQuery(trpc.applications.list.queryOptions({ search: undefined }));
  const profileQuery = useQuery(trpc.profile.getMyProfile.queryOptions());
  const savedJobOptions = trpc.savedJob.isSaved.queryOptions({ jobId });
  const savedJobQuery = useQuery(savedJobOptions);
  const toggleSavedJob = useMutation(
    trpc.savedJob.toggle.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: savedJobOptions.queryKey });
      },
    }),
  );

  const isLoadingTrigger = hasAppliedQuery.isLoading || profileQuery.isLoading || apiLoading;

  const hasApplied = useMemo(() => {
    if (hasAppliedQuery.data == null) return false;
    const applications = hasAppliedQuery.data as unknown as Array<{ job?: { id: string } | null }>;
    return applications.some((a) => a.job?.id === jobId);
  }, [hasAppliedQuery.data, jobId]);

  const applicationStatus = useMemo(() => {
    if (hasAppliedQuery.data == null) return null;
    const applications = hasAppliedQuery.data as unknown as Array<{
      status: string | null;
      job?: { id: string } | null;
    }>;
    const app = applications.find((a) => a.job?.id === jobId);
    return app?.status ?? null;
  }, [hasAppliedQuery.data, jobId]);

  const isProfileComplete = useMemo(() => {
    const p = profileQuery.data;
    if (!p) return false;
    return Boolean(p.summary && p.resumeUrl);
  }, [profileQuery.data]);

  if (!job && !apiLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-4">
          Không tìm thấy công việc
        </h1>
        <p className="text-gray-500 mb-6">Công việc này có thể đã bị xóa hoặc hết hạn.</p>
        <Link
          to="/jobs"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Skeleton className="h-96 w-full max-w-4xl rounded-xl" />
      </div>
    );
  }

  const isSaved = savedJobQuery.data?.saved ?? false;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to="/jobs" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          &larr; Quay lại danh sách
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              {job.companyLogo ? (
                <img
                  src={job.companyLogo}
                  alt={job.companyName}
                  className="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 shrink-0">
                  <span className="text-xs text-gray-500">Logo</span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                <p className="text-lg text-gray-600 mt-1">{job.companyName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => toggleSavedJob.mutate({ jobId: job.id })}
                disabled={toggleSavedJob.isPending}
                className={`flex-1 md:flex-none px-4 py-2 border rounded-md font-medium transition-colors ${
                  isSaved
                    ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {isSaved ? "Đã lưu" : "Lưu công việc"}
              </button>

              {isLoadingTrigger ? (
                <Skeleton className="h-10 w-32 md:w-40 rounded-md" />
              ) : (
                <ApplyJobModal
                  jobId={job.id}
                  jobStatus={job.status || "OPEN"}
                  hasApplied={hasApplied}
                  isProfileComplete={isProfileComplete}
                  applicationStatus={applicationStatus}
                />
              )}
            </div>
          </div>

          <hr className="my-8 border-gray-100" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Địa điểm</p>
              <p className="font-semibold text-gray-900">{job.location}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Mức lương</p>
              <p className="font-semibold text-gray-900">{job.salaryRange}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Hình thức</p>
              <p className="font-semibold text-gray-900">{job.workType}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Loại công việc</p>
              <p className="font-semibold text-gray-900">{job.jobType}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Mô tả công việc</h2>
            <div className="text-gray-700 leading-relaxed space-y-2">
              <p>{job.description || "Chưa có mô tả chi tiết."}</p>
              {job.skills.length > 0 && (
                <>
                  <p className="font-semibold text-gray-800 mt-4">Yêu cầu kỹ năng:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {job.skills.map((skill: string) => (
                      <li key={skill}>{skill}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
