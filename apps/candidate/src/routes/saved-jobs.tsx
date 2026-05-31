import { createFileRoute } from '@tanstack/react-router';
import { useJobs } from './__root'; // Lấy dữ liệu từ Context chung
import { JobCardItem } from "@/components/job-card";

export const Route = createFileRoute('/saved-jobs')({
    component: SavedJobsPage,
});

function SavedJobsPage() {
    // Gọi kho dữ liệu chung
    const { jobs, toggleSave } = useJobs();

    // Lọc ra những công việc đã được thả tim
    const savedJobs = jobs.filter(job => job.isSaved);

    return (
        <div className="max-w-5xl mx-auto p-6 min-h-screen">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Việc làm đã lưu</h1>

            {savedJobs.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {savedJobs.map((job) => (
                        <JobCardItem
                            key={job.id}
                            job={job as any}
                            onSave={toggleSave}
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