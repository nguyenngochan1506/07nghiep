import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/jobs/$jobId')({
    component: JobDetailPage,
});

function JobDetailPage() {
    const { jobId } = Route.useParams();

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
                <h1 className="text-2xl font-bold mb-2">Chi tiết công việc (ID: {jobId})</h1>
                <p className="text-gray-600 mb-6">Chờ tích hợp API lấy chi tiết việc làm dựa trên ID...</p>

                <div className="flex gap-4">
                    <button className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700">
                        Ứng tuyển ngay
                    </button>
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