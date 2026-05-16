import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { mockJobs } from "@/utils/mock-jobs";

export const Route = createFileRoute("/jobs/$jobId")({
    component: JobDetailPage,
});

function JobDetailPage() {
    // Lấy tham số jobId từ URL
    const { jobId } = Route.useParams();

    // Tìm công việc có id khớp với URL trong danh sách mockJobs
    const job = mockJobs.find((j) => j.id === jobId);

    // Trạng thái tạm thời cho nút "Lưu công việc"
    const [isSaved, setIsSaved] = useState(false);

    // Xử lý trường hợp người dùng nhập ID không tồn tại
    if (!job) {
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

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Nút quay lại */}
                <Link to="/jobs" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    &larr; Quay lại danh sách
                </Link>

                {/* Khung thông tin chính */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">

                        {/* Logo và Tiêu đề */}
                        <div className="flex items-center gap-4">
                            <img
                                src={job.companyLogo}
                                alt={`${job.companyName} logo`}
                                className="w-16 h-16 rounded-lg object-cover border border-gray-100"
                            />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                                <p className="text-lg text-gray-600 mt-1">{job.companyName}</p>
                            </div>
                        </div>

                        {/* Các nút hành động */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button
                                onClick={() => setIsSaved(!isSaved)}
                                className={`flex-1 md:flex-none px-4 py-2 border rounded-md font-medium transition-colors ${
                                    isSaved
                                        ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                            >
                                {isSaved ? "Đã lưu" : "Lưu công việc"}
                            </button>
                            <button className="flex-1 md:flex-none px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors">
                                Ứng tuyển ngay
                            </button>
                        </div>
                    </div>

                    <hr className="my-8 border-gray-100" />

                    {/* Các thẻ thông tin nhanh */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500 mb-1">Địa điểm</p>
                            <p className="font-semibold text-gray-900">{job.location}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500 mb-1">Mức lương</p>
                            <p className="font-semibold text-gray-900">{job.salaryRange || "Thỏa thuận"}</p>
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

                    {/* Phần mô tả công việc */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900">Mô tả công việc</h2>
                        <div className="text-gray-700 leading-relaxed space-y-2">
                            <p>
                                {job.description ||
                                    "Chúng tôi đang tìm kiếm ứng viên tài năng tham gia vào đội ngũ phát triển. Bạn sẽ có cơ hội làm việc trong môi trường năng động, dự án quy mô lớn và được hưởng các chế độ đãi ngộ hấp dẫn."}
                            </p>
                            <p>Yêu cầu kỹ năng:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                {job.skills.map((skill) => (
                                    <li key={skill}>{skill}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}