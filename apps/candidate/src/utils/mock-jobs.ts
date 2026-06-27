export type JobType = "Full-time" | "Part-time" | "Contract" | "Internship";
export type WorkType = "Remote" | "Hybrid" | "Onsite";
export type ExperienceLevel = "Entry" | "Junior" | "Mid" | "Senior" | "Lead";

export interface Job {
  id: string;
  companyName: string;
  companyLogo: string;
  isVerified: boolean;
  title: string;
  location: string;
  workType: WorkType;
  jobType: JobType;
  experience: ExperienceLevel;
  salaryRange: string; // <-- Đã sửa thành salaryRange
  skills: string[];
  postedDate: string; // <-- Đã sửa thành postedDate
  description?: string;
  viewCount: number;
}

export const mockJobs: Job[] = [
  {
    id: "1",
    companyName: "TechCorp Vietnam",
    companyLogo: "https://ui-avatars.com/api/?name=Tech+Corp&background=random",
    isVerified: true,
    title: "Senior Frontend Developer (React/Vite)",
    location: "Ho Chi Minh City",
    workType: "Hybrid",
    jobType: "Full-time",
    experience: "Senior",
    salaryRange: "$2,000 - $3,500", // <-- Cập nhật data
    skills: ["React", "TypeScript", "Tailwind CSS"],
    postedDate: "2 giờ trước", // <-- Cập nhật data
    viewCount: 150,
  },
  {
    id: "2",
    companyName: "Global Innovate",
    companyLogo: "https://ui-avatars.com/api/?name=Global+Innovate&background=random",
    isVerified: false,
    title: "Backend Engineer (Node.js/Hono)",
    location: "Da Nang",
    workType: "Remote",
    jobType: "Contract",
    experience: "Mid",
    salaryRange: "$1,500 - $2,500",
    skills: ["Node.js", "Hono", "PostgreSQL", "Prisma"],
    postedDate: "3 ngày trước",
    viewCount: 89,
  },
  {
    id: "3",
    companyName: "Fintech Start",
    companyLogo: "https://ui-avatars.com/api/?name=Fintech+Start&background=random",
    isVerified: true,
    title: "Product Designer",
    location: "Hanoi",
    workType: "Onsite",
    jobType: "Full-time",
    experience: "Junior",
    salaryRange: "$800 - $1,200",
    skills: ["Figma", "UI/UX", "Prototyping"],
    postedDate: "10 ngày trước",
    viewCount: 320,
  },
];
