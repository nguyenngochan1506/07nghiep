import { useState, useEffect } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ExperienceLevel, JobType, SalaryType, WorkType } from "@07nghiep/db";
import type { JobUpdateInput } from "@07nghiep/server/lib/api";
import { toast } from "sonner";
import { Save, ArrowLeft, ArrowRight, Send } from "lucide-react";

import { Button } from "@07nghiep/ui/components/button";
import { Card } from "@07nghiep/ui/components/card";
import { Skeleton } from "@07nghiep/ui/components/skeleton";

import { authorizedRoles } from "@/lib/role-guard";
import { authClient } from "@/lib/auth-client";
import { trpc, trpcClient } from "@/utils/trpc";
import { JobFormStepper } from "@/components/jobs/job-form-stepper";
import { JobStep1, type Step1Data } from "@/components/jobs/job-step-1";
import { JobStep2, type Step2Data } from "@/components/jobs/job-step-2";
import { JobStep3, type Step3Data } from "@/components/jobs/job-step-3";
import { JobStep4, type Step4Data } from "@/components/jobs/job-step-4";
import { JobPreview } from "@/components/jobs/job-preview";

const TOTAL_STEPS = 5;

type FormErrors = Partial<Record<string, string>>;

type EditableJob = {
  title: string;
  jobType: string;
  workType: string;
  experienceLevel: string;
  location: string;
  description: string;
  requirements: string | null;
  benefits: string | null;
  skills: string[];
  salaryNegotiable: boolean;
  salaryType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  expiresAt: Date | string | null;
};

const JOB_TYPE_VALUES = ["FULLTIME", "PARTIME", "CONTRACT", "INTERNSHIP", "FREELANCE"] as const;
const WORK_TYPE_VALUES = ["REMOTE", "HYBRID", "ONSITE"] as const;
const EXPERIENCE_LEVEL_VALUES = [
  "ENTRY",
  "JUNIOR",
  "MIDDLE",
  "SENIOR",
  "LEAD",
  "EXECUTIVE",
] as const;
const SALARY_TYPE_VALUES = ["HOURLY", "MONTHLY", "YEARLY"] as const;

function isJobType(value: string): value is JobType {
  return JOB_TYPE_VALUES.includes(value as (typeof JOB_TYPE_VALUES)[number]);
}

function isWorkType(value: string): value is WorkType {
  return WORK_TYPE_VALUES.includes(value as (typeof WORK_TYPE_VALUES)[number]);
}

function isExperienceLevel(value: string): value is ExperienceLevel {
  return EXPERIENCE_LEVEL_VALUES.includes(value as (typeof EXPERIENCE_LEVEL_VALUES)[number]);
}

function isSalaryType(value: string): value is SalaryType {
  return SALARY_TYPE_VALUES.includes(value as (typeof SALARY_TYPE_VALUES)[number]);
}

export const Route = createFileRoute("/my-jobs/$jobId/edit")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) redirect({ to: "/login", throw: true });
    const role = (session.data?.user as { role?: string }).role ?? "CANDIDATE";
    if (!authorizedRoles(role)) {
      await authClient.signOut();
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
  component: EditJobPage,
});

function EditJobPage() {
  const navigate = useNavigate();
  const { jobId } = Route.useParams();
  const { session } = Route.useRouteContext();
  const [currentStep, setCurrentStep] = useState(1);

  // ── Form State ────────────────────────────────────────────────────────────
  const [step1, setStep1] = useState<Step1Data>({
    title: "",
    jobType: "",
    workType: "",
    experienceLevel: "",
    location: "",
  });
  const [step2, setStep2] = useState<Step2Data>({
    description: "",
    requirements: "",
    benefits: "",
    skills: [],
  });
  const [step3, setStep3] = useState<Step3Data>({
    salaryNegotiable: false,
    salaryType: "",
    salaryMin: "",
    salaryMax: "",
  });
  const [step4, setStep4] = useState<Step4Data>({
    expiresAt: "",
  });

  const [errors, _setErrors] = useState<FormErrors>({});

  // ── Load Job Data ─────────────────────────────────────────────────────────
  const jobQuery = useQuery(trpc.job.getById.queryOptions({ id: jobId }));

  useEffect(() => {
    if (jobQuery.data) {
      const job = jobQuery.data as unknown as EditableJob;
      setStep1({
        title: job.title,
        jobType: job.jobType,
        workType: job.workType,
        experienceLevel: job.experienceLevel,
        location: job.location,
      });
      setStep2({
        description: job.description,
        requirements: job.requirements || "",
        benefits: job.benefits || "",
        skills: job.skills,
      });
      setStep3({
        salaryNegotiable: job.salaryNegotiable,
        salaryType: job.salaryType || "",
        salaryMin: job.salaryMin ? String(job.salaryMin) : "",
        salaryMax: job.salaryMax ? String(job.salaryMax) : "",
      });
      setStep4({
        expiresAt: job.expiresAt ? new Date(job.expiresAt).toISOString().split("T")[0] : "",
      });
    }
  }, [jobQuery.data]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (input: JobUpdateInput) => trpcClient.job.update.mutate(input),
    onSuccess: () => {
      toast.success("Cập nhật thành công!");
      navigate({ to: "/my-jobs" });
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSave(status?: "DRAFT" | "OPEN") {
    const payload: JobUpdateInput = {
      id: jobId,
      title: step1.title,
      location: step1.location,
      description: step2.description,
      requirements: step2.requirements || undefined,
      benefits: step2.benefits || undefined,
      skills: step2.skills,
      salaryNegotiable: step3.salaryNegotiable,
      salaryMin: step3.salaryMin ? Number(step3.salaryMin) : undefined,
      salaryMax: step3.salaryMax ? Number(step3.salaryMax) : undefined,
      expiresAt: step4.expiresAt ? new Date(step4.expiresAt) : undefined,
    };
    if (isJobType(step1.jobType)) payload.jobType = step1.jobType;
    if (isWorkType(step1.workType)) payload.workType = step1.workType;
    if (isExperienceLevel(step1.experienceLevel)) {
      payload.experienceLevel = step1.experienceLevel;
    }
    if (isSalaryType(step3.salaryType)) payload.salaryType = step3.salaryType;
    const payloadWithStatus: JobUpdateInput & { status?: "DRAFT" | "OPEN" } = payload;
    if (status) payloadWithStatus.status = status;
    updateMutation.mutate(payloadWithStatus);
  }

  function handleStep2Change(field: keyof Step2Data, value: string | string[]) {
    setStep2((prev) => {
      if (field === "skills") {
        return { ...prev, skills: Array.isArray(value) ? value : prev.skills };
      }
      return { ...prev, [field]: typeof value === "string" ? value : prev[field] };
    });
  }

  function handleStep3Change(field: keyof Step3Data, value: string | boolean) {
    setStep3((prev) => {
      if (field === "salaryNegotiable") {
        return {
          ...prev,
          salaryNegotiable: typeof value === "boolean" ? value : prev.salaryNegotiable,
        };
      }
      return { ...prev, [field]: typeof value === "string" ? value : prev[field] };
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function handleNext() {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
    }
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(1, s - 1));
  }

  if (jobQuery.isLoading) {
    return (
      <div className="container mx-auto max-w-3xl py-12">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 px-4 py-8">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Chỉnh sửa tin tuyển dụng</h1>
            <p className="text-sm text-muted-foreground">
              Bước {currentStep}/{TOTAL_STEPS}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave()}
            disabled={updateMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Lưu thay đổi
          </Button>
        </div>

        <JobFormStepper currentStep={currentStep} />

        <Card className="p-6">
          {currentStep === 1 && (
            <JobStep1
              data={step1}
              errors={errors}
              onChange={(field, value) => setStep1((prev) => ({ ...prev, [field]: value }))}
            />
          )}
          {currentStep === 2 && (
            <JobStep2 data={step2} errors={errors} onChange={handleStep2Change} />
          )}
          {currentStep === 3 && (
            <JobStep3 data={step3} errors={errors} onChange={handleStep3Change} />
          )}
          {currentStep === 4 && (
            <JobStep4
              data={step4}
              errors={errors}
              onChange={(field, value) => setStep4((prev) => ({ ...prev, [field]: value }))}
            />
          )}
          {currentStep === 5 && (
            <JobPreview
              step1={step1}
              step2={step2}
              step3={step3}
              step4={step4}
              companyName={session.data?.user.name}
            />
          )}
        </Card>

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || updateMutation.isPending}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>

          <div className="flex gap-3">
            {currentStep === TOTAL_STEPS ? (
              <Button
                onClick={() => handleSave("OPEN")}
                disabled={updateMutation.isPending}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Cập nhật & Đăng
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-2">
                Tiếp theo
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
