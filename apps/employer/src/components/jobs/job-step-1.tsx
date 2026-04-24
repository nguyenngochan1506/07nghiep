import { Label } from "@07nghiep/ui/components/label";
import { Input } from "@07nghiep/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@07nghiep/ui/components/select";

export interface Step1Data {
  title: string;
  jobType: string;
  workType: string;
  experienceLevel: string;
  location: string;
}

interface JobStep1Props {
  data: Step1Data;
  errors: Partial<Record<keyof Step1Data, string>>;
  onChange: (field: keyof Step1Data, value: string) => void;
}

const JOB_TYPES = [
  { value: "FULLTIME", label: "Toàn thời gian" },
  { value: "PARTIME", label: "Bán thời gian" },
  { value: "CONTRACT", label: "Hợp đồng" },
  { value: "INTERNSHIP", label: "Thực tập" },
  { value: "FREELANCE", label: "Freelance" },
];

const WORK_TYPES = [
  { value: "ONSITE", label: "Tại văn phòng" },
  { value: "REMOTE", label: "Làm từ xa" },
  { value: "HYBRID", label: "Hybrid" },
];

const EXPERIENCE_LEVELS = [
  { value: "ENTRY", label: "Mới tốt nghiệp / Không kinh nghiệm" },
  { value: "JUNIOR", label: "Junior (1-2 năm)" },
  { value: "MIDDLE", label: "Middle (2-4 năm)" },
  { value: "SENIOR", label: "Senior (4-7 năm)" },
  { value: "LEAD", label: "Lead / Principal (7+ năm)" },
  { value: "EXECUTIVE", label: "Cấp điều hành" },
];

export function JobStep1({ data, errors, onChange }: JobStep1Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Thông tin cơ bản</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Điền thông tin chính về vị trí tuyển dụng
        </p>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="job-title">
          Tiêu đề công việc <span className="text-destructive">*</span>
        </Label>
        <Input
          id="job-title"
          placeholder="Ví dụ: Senior Frontend Developer"
          value={data.title}
          onChange={(e) => onChange("title", e.target.value)}
          className={errors.title ? "border-destructive" : ""}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title}</p>
        )}
      </div>

      {/* Job Type & Work Type */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="job-type">
            Loại hợp đồng <span className="text-destructive">*</span>
          </Label>
          <Select
            value={data.jobType}
            onValueChange={(v) => onChange("jobType", v || "")}
          >
            <SelectTrigger id="job-type" className={errors.jobType ? "border-destructive" : ""}>
              <SelectValue placeholder="Chọn loại hợp đồng" />
            </SelectTrigger>
            <SelectContent>
              {JOB_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.jobType && (
            <p className="text-sm text-destructive">{errors.jobType}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="work-type">
            Hình thức làm việc <span className="text-destructive">*</span>
          </Label>
          <Select
            value={data.workType}
            onValueChange={(v) => onChange("workType", v || "")}
          >
            <SelectTrigger id="work-type" className={errors.workType ? "border-destructive" : ""}>
              <SelectValue placeholder="Chọn hình thức" />
            </SelectTrigger>
            <SelectContent>
              {WORK_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.workType && (
            <p className="text-sm text-destructive">{errors.workType}</p>
          )}
        </div>
      </div>

      {/* Experience Level */}
      <div className="space-y-2">
        <Label htmlFor="experience-level">
          Cấp độ kinh nghiệm <span className="text-destructive">*</span>
        </Label>
        <Select
          value={data.experienceLevel}
          onValueChange={(v) => onChange("experienceLevel", v || "")}
        >
          <SelectTrigger
            id="experience-level"
            className={errors.experienceLevel ? "border-destructive" : ""}
          >
            <SelectValue placeholder="Chọn cấp độ kinh nghiệm" />
          </SelectTrigger>
          <SelectContent>
            {EXPERIENCE_LEVELS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.experienceLevel && (
          <p className="text-sm text-destructive">{errors.experienceLevel}</p>
        )}
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">
          Địa điểm làm việc <span className="text-destructive">*</span>
        </Label>
        <Input
          id="location"
          placeholder="Ví dụ: Hà Nội, Hồ Chí Minh, hoặc Toàn quốc"
          value={data.location}
          onChange={(e) => onChange("location", e.target.value)}
          className={errors.location ? "border-destructive" : ""}
        />
        {errors.location && (
          <p className="text-sm text-destructive">{errors.location}</p>
        )}
      </div>
    </div>
  );
}
