import { Link } from '@tanstack/react-router';

export interface Job {
    id: string;
    title: string;
    companyName: string;
    companyLogo: string;
    isVerified: boolean;
    location: string;
    workType: string;
    jobType: string;
    salaryRange: string;
    skills: string[];
    postedDate: string;
    isSaved?: boolean;
}

interface JobCardProps {
    job: Job;
    onSave?: (id: string) => void;
}

export function JobCardItem({ job, onSave }: JobCardProps) {
    return (
        <div className="border rounded-lg p-4 mb-4 shadow-sm bg-white flex flex-col gap-3">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                        <span className="text-xs text-gray-500">Logo</span>
                    </div>
                    <div>
                        <Link to={`/jobs/$jobId`} params={{ jobId: job.id }} className="text-lg font-semibold hover:underline text-blue-600">
                            {job.title}
                        </Link>
                        <p className="text-sm text-gray-600">
                            {job.companyName} {job.isVerified && <span className="text-green-500 ml-1">✓</span>}
                        </p>
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onSave?.(job.id);
                    }}
                    className="text-gray-500 hover:text-red-500 transition-colors"
                >
                    {job.isSaved ? '❤️' : '🤍'}
                </button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                <span className="bg-gray-100 px-2 py-1 rounded">📍 {job.location}</span>
                <span className="bg-gray-100 px-2 py-1 rounded">🏢 {job.workType}</span>
                <span className="bg-gray-100 px-2 py-1 rounded">⏱️ {job.jobType}</span>
                <span className="bg-gray-100 px-2 py-1 rounded text-green-600 font-medium">💰 {job.salaryRange}</span>
            </div>

            <div className="flex flex-wrap gap-2 mt-1">
                {job.skills.map(skill => (
                    <span key={skill} className="bg-blue-50 text-blue-600 border border-blue-100 text-xs px-2 py-1 rounded-md">
                        {skill}
                    </span>
                ))}
            </div>

            <div className="text-xs text-gray-400 mt-2">
                Đăng: {job.postedDate}
            </div>
        </div>
    );
}