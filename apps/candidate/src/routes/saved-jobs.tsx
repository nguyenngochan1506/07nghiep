import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery } from "@tanstack/react-query";
import { JobCardItem } from "@/components/job-card";
import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute('/saved-jobs')({
    component: SavedJobsPage,
});

function mapSavedJob(raw: any) {
    const salaryRange =
        raw.salaryMin && raw.salaryMax
            ? `$${raw.salaryMin.toLocaleString()} - $${raw.salaryMax.toLocaleString()}`
            : "Thỏa thuận";

    const postedAt = new Date(raw.createdAt);
    const diffDays = Math.floor((Date.now() - postedAt.getTime()) / (1000 * 60 * 60 * 24));
    const postedDate =
        diffDays === 0 ? "Hôm nay" :
        diffDays === 1 ? "1 ngày trước" :
        diffDays < 30 ? `${diffDays} ngày trước` :
        `${Math.floor(diffDays / 30)} tháng trước`;

    return {
        id: raw.id,
        companyName: raw.organization?.name ?? "Unknown",
        companyLogo: raw.organization?.logoUrl ?? "",
        isVerified: raw.organization?.verified ?? false,
        title: raw.title,
        location: raw.location ?? "",
        workType: raw.workType ?? "",
        jobType: raw.jobType ?? "",
        salaryRange,
        skills: raw.skills ?? [],
        postedDate,
        isSaved: true,
    };
}

function SavedJobsPage() {
    const savedJobsOptions = trpc.savedJob.list.queryOptions({ page: 1, pageSize: 20 });
    const savedJobsQuery = useQuery(savedJobsOptions);
    const toggleSavedJob = useMutation(
        trpc.savedJob.toggle.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: savedJobsOptions.queryKey });
            },
        }),
    );
    const savedJobs = (savedJobsQuery.data?.jobs ?? []).map(mapSavedJob);

    return (
        <div className="max-w-5xl mx-auto p-6 min-h-screen">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Việc làm đã lưu</h1>

            {savedJobsQuery.isLoading ? (
                <div className="bg-white p-12 rounded-xl shadow-sm border border-dashed border-gray-300 text-center">
                    <p className="text-gray-500">Đang tải việc làm đã lưu...</p>
                </div>
            ) : savedJobs.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {savedJobs.map((job) => (
                        <JobCardItem
                            key={job.id}
                            job={job as any}
                            onSave={(jobId) => toggleSavedJob.mutate({ jobId })}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white p-12 rounded-xl shadow-sm border border-dashed border-gray-300 text-center flex flex-col items-center justify-center">
                    <span className="text-4xl mb-4">🤍</span>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Chưa có công việc nào được lưu</h3>
                    <p className="text-gray-500 max-w-sm">
                        Hãy quay lại trang danh sách việc làm và nhấn vào biểu tượng trái tim để lưu lại những vị trí hấp dẫn nhé!
                    </p>
                </div>
            )}
        </div>
    );
}
