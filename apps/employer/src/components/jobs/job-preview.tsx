import { MapPin, Briefcase, Clock, DollarSign, Calendar, GraduationCap, Tag } from "lucide-react";
import { Badge } from "@07nghiep/ui/components/badge";
import { Card } from "@07nghiep/ui/components/card";
import { Separator } from "@07nghiep/ui/components/separator";
import type { Step1Data } from "./job-step-1";
import type { Step2Data } from "./job-step-2";
import type { Step3Data } from "./job-step-3";
import type { Step4Data } from "./job-step-4";

interface JobPreviewProps {
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  step4: Step4Data;
  companyName?: string;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULLTIME: "Toàn thời gian",
  PARTIME: "Bán thời gian",
  CONTRACT: "Hợp đồng",
  INTERNSHIP: "Thực tập",
  FREELANCE: "Freelance",
};

const WORK_TYPE_LABELS: Record<string, string> = {
  ONSITE: "Tại văn phòng",
  REMOTE: "Làm từ xa",
  HYBRID: "Hybrid",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  ENTRY: "Không yêu cầu kinh nghiệm",
  JUNIOR: "Junior (1-2 năm)",
  MIDDLE: "Middle (2-4 năm)",
  SENIOR: "Senior (4-7 năm)",
  LEAD: "Lead (7+ năm)",
  EXECUTIVE: "Cấp điều hành",
};

const SALARY_TYPE_LABELS: Record<string, string> = {
  MONTHLY: "/ tháng",
  YEARLY: "/ năm",
  HOURLY: "/ giờ",
};

function formatSalary(min: string, max: string, type: string, negotiable: boolean): string {
  if (negotiable) return "Thỏa thuận";
  const fmt = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
  if (!min && !max) return "Chưa cập nhật";
  const suffix = SALARY_TYPE_LABELS[type] ?? "";
  if (min && max) return `${fmt.format(Number(min))} – ${fmt.format(Number(max))} ${suffix}`;
  if (min) return `Từ ${fmt.format(Number(min))} ${suffix}`;
  return `Đến ${fmt.format(Number(max))} ${suffix}`;
}

export function JobPreview({ step1, step2, step3, step4, companyName }: JobPreviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Xem trước tin tuyển dụng</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Đây là cách ứng viên sẽ nhìn thấy tin của bạn
        </p>
      </div>

      <Card className="overflow-hidden">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {step1.title || (
                  <span className="text-muted-foreground italic">(Chưa có tiêu đề)</span>
                )}
              </h1>
              {companyName && <p className="mt-1 text-muted-foreground">{companyName}</p>}
            </div>
            <Badge className="shrink-0">Đang tuyển</Badge>
          </div>

          {/* Quick info */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {step1.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {step1.location}
              </span>
            )}
            {step1.jobType && (
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                {JOB_TYPE_LABELS[step1.jobType] ?? step1.jobType}
              </span>
            )}
            {step1.workType && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {WORK_TYPE_LABELS[step1.workType] ?? step1.workType}
              </span>
            )}
            {step1.experienceLevel && (
              <span className="flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4" />
                {EXPERIENCE_LABELS[step1.experienceLevel] ?? step1.experienceLevel}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              {formatSalary(
                step3.salaryMin,
                step3.salaryMax,
                step3.salaryType,
                step3.salaryNegotiable,
              )}
            </span>
            {step4.expiresAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Hết hạn: {new Date(step4.expiresAt).toLocaleDateString("vi-VN")}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="space-y-6 p-6">
          {/* Skills */}
          {step2.skills.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Tag className="h-4 w-4 text-primary" />
                Kỹ năng yêu cầu
              </h3>
              <div className="flex flex-wrap gap-2">
                {step2.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {step2.description && (
            <>
              <Separator />
              <div>
                <h3 className="mb-3 font-semibold">Mô tả công việc</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {step2.description}
                </p>
              </div>
            </>
          )}

          {step2.requirements && (
            <>
              <Separator />
              <div>
                <h3 className="mb-3 font-semibold">Yêu cầu ứng viên</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {step2.requirements}
                </p>
              </div>
            </>
          )}

          {step2.benefits && (
            <>
              <Separator />
              <div>
                <h3 className="mb-3 font-semibold">Quyền lợi</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {step2.benefits}
                </p>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
