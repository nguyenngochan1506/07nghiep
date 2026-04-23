import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/saved-jobs')({
    component: SavedJobsPage,
});

function SavedJobsPage() {
    return (
        <div className="max-w-5xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Việc làm đã lưu</h1>
            <div className="bg-white p-10 rounded-lg shadow-sm border text-center text-gray-500">
                Chờ tích hợp API danh sách việc làm đã lưu...
            </div>
        </div>
    );
}
