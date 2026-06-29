import { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, ArrowLeft, ArrowRight, Send } from "lucide-react";

import { Button } from "@07nghiep/ui/components/button";
import { Card } from "@07nghiep/ui/components/card";

import { authorizedRoles } from "@/lib/role-guard";
import { authClient } from "@/lib/auth-client";
import { trpcClient } from "@/utils/trpc";
import { JobFormStepper } from "@/components/jobs/job-form-stepper";
import { JobStep1, type Step1Data } from "@/components/jobs/job-step-1";
import { JobStep2, type Step2Data } from "@/components/jobs/job-step-2";
import { JobStep3, type Step3Data } from "@/components/jobs/job-step-3";
import { JobStep4, type Step4Data } from "@/components/jobs/job-step-4";
import { JobPreview } from "@/components/jobs/job-preview";

const DRAFT_KEY = "employer:job:draft";
const TOTAL_STEPS = 5;

type FormErrors = Partial<Record<string, string>>;

const DEFAULT_STEP1: Step1Data = {
  title: "",
  jobType: "",
  workType: "",
  experienceLevel: "",
  location: "",
};

const DEFAULT_STEP2: Step2Data = {
  description: "",
  requirements: "",
  benefits: "",
  skills: [],
};

const DEFAULT_STEP3: Step3Data = {
  salaryNegotiable: false,
  salaryType: "",
  salaryMin: "",
  salaryMax: "",
};

const DEFAULT_STEP4: Step4Data = {
  expiresAt: "",
};

export const Route = createFileRoute("/jobs/new")({
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
  component: NewJobPage,
});

function validateStep1(data: Step1Data): FormErrors {
  const errors: FormErrors = {};
  if (!data.title || data.title.trim().length < 5) errors.title = "Tiêu đề phải có ít nhất 5 ký tự";
  if (!data.jobType) errors.jobType = "Vui lòng chọn loại hợp đồng";
  if (!data.workType) errors.workType = "Vui lòng chọn hình thức làm việc";
  if (!data.experienceLevel) errors.experienceLevel = "Vui lòng chọn cấp độ kinh nghiệm";
  if (!data.location || data.location.trim().length < 2) errors.location = "Địa điểm là bắt buộc";
  return errors;
}

function validateStep2(data: Step2Data): FormErrors {
  const errors: FormErrors = {};
  if (!data.description || data.description.trim().length < 50)
    errors.description = "Mô tả phải có ít nhất 50 ký tự";
  return errors;
}

function validateStep3(data: Step3Data): FormErrors {
  const errors: FormErrors = {};
  if (!data.salaryNegotiable) {
    const min = Number(data.salaryMin);
    const max = Number(data.salaryMax);
    if (data.salaryMin && Number.isNaN(min)) errors.salaryMin = "Lương không hợp lệ";
    if (data.salaryMax && Number.isNaN(max)) errors.salaryMax = "Lương không hợp lệ";
    if (data.salaryMin && data.salaryMax && min > max)
      errors.salaryMax = "Lương tối đa phải lớn hơn lương tối thiểu";
  }
  return errors;
}

function validateStep4(data: Step4Data): FormErrors {
  const errors: FormErrors = {};
  if (data.expiresAt) {
    const d = new Date(data.expiresAt);
    if (Number.isNaN(d.getTime()) || d <= new Date())
      errors.expiresAt = "Ngày hết hạn phải trong tương lai";
  }
  return errors;
}

function NewJobPage() {
  const navigate = useNavigate();
  const { session } = Route.useRouteContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [step1, setStep1] = useState<Step1Data>(DEFAULT_STEP1);
  const [step2, setStep2] = useState<Step2Data>(DEFAULT_STEP2);
  const [step3, setStep3] = useState<Step3Data>(DEFAULT_STEP3);
  const [step4, setStep4] = useState<Step4Data>(DEFAULT_STEP4);
  const [errors, setErrors] = useState<FormErrors>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load draft from localStorage ─────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.step1) setStep1(draft.step1);
        if (draft.step2) setStep2(draft.step2);
        if (draft.step3) setStep3(draft.step3);
        if (draft.step4) setStep4(draft.step4);
        toast.info("Đã khôi phục bản nháp trước đó");
      }
    } catch {
      // ignore corrupt drafts
    }
  }, []);

  // ── Auto-save draft every 30s ─────────────────────────────────────────────
  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step1, step2, step3, step4 }));
      setLastSaved(new Date());
    } catch {
      // ignore storage errors
    }
  }, [step1, step2, step3, step4]);

  useEffect(() => {
    autoSaveRef.current = setTimeout(saveDraft, 30_000);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [saveDraft]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createJob = useMutation({
    mutationFn: (input: ReturnType<typeof buildPayload>) => trpcClient.job.create.mutate(input),
    onSuccess: () => {
      localStorage.removeItem(DRAFT_KEY);
      toast.success("Tin tuyển dụng đã được gửi duyệt!");
      navigate({ to: "/my-jobs" });
    },
    onError: (err) => toast.error(err.message),
  });

  const saveDraftMutation = useMutation({
    mutationFn: (input: ReturnType<typeof buildPayload>) => trpcClient.job.create.mutate(input),
    onSuccess: () => {
      localStorage.removeItem(DRAFT_KEY);
      toast.success("Đã lưu nháp thành công!");
      navigate({ to: "/my-jobs" });
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Step navigation ───────────────────────────────────────────────────────
  function validateCurrentStep(): boolean {
    let errs: FormErrors = {};
    if (currentStep === 1) errs = validateStep1(step1);
    if (currentStep === 2) errs = validateStep2(step2);
    if (currentStep === 3) errs = validateStep3(step3);
    if (currentStep === 4) errs = validateStep4(step4);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (currentStep < TOTAL_STEPS && validateCurrentStep()) {
      saveDraft();
      setCurrentStep((s) => s + 1);
    }
  }

  function handleBack() {
    setErrors({});
    setCurrentStep((s) => Math.max(1, s - 1));
  }

  function buildPayload(status: "DRAFT" | "PENDING_APPROVAL") {
    return {
      title: step1.title,
      jobType: step1.jobType as "FULLTIME" | "PARTIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE",
      workType: step1.workType as "REMOTE" | "HYBRID" | "ONSITE",
      experienceLevel: step1.experienceLevel as
        | "ENTRY"
        | "JUNIOR"
        | "MIDDLE"
        | "SENIOR"
        | "LEAD"
        | "EXECUTIVE",
      location: step1.location,
      description: step2.description,
      requirements: step2.requirements || undefined,
      benefits: step2.benefits || undefined,
      skills: step2.skills,
      salaryNegotiable: step3.salaryNegotiable,
      salaryType: step3.salaryType
        ? (step3.salaryType as "HOURLY" | "MONTHLY" | "YEARLY")
        : undefined,
      salaryMin: step3.salaryMin ? Number(step3.salaryMin) : undefined,
      salaryMax: step3.salaryMax ? Number(step3.salaryMax) : undefined,
      expiresAt: step4.expiresAt ? new Date(step4.expiresAt) : undefined,
      status,
    };
  }

  function handlePublish() {
    createJob.mutate(buildPayload("PENDING_APPROVAL"));
  }

  function handleSaveDraft() {
    saveDraftMutation.mutate(buildPayload("DRAFT"));
  }

  function handleManualSave() {
    saveDraft();
    toast.success("Đã lưu nháp vào trình duyệt");
  }

  const isSubmitting = createJob.isPending || saveDraftMutation.isPending;

  return (
    <div className="min-h-screen bg-secondary/30 px-4 py-8">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Đăng tin tuyển dụng mới</h1>
            <p className="text-sm text-muted-foreground">
              Bước {currentStep}/{TOTAL_STEPS}
              {lastSaved && (
                <span className="ml-2 text-xs">
                  · Đã lưu {lastSaved.toLocaleTimeString("vi-VN")}
                </span>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleManualSave} className="gap-2">
            <Save className="h-4 w-4" />
            Lưu nháp
          </Button>
        </div>

        {/* Stepper */}
        <JobFormStepper currentStep={currentStep} />

        {/* Step Content */}
        <Card className="p-6">
          {currentStep === 1 && (
            <JobStep1
              data={step1}
              errors={errors}
              onChange={(field, value) => setStep1((prev) => ({ ...prev, [field]: value }))}
            />
          )}
          {currentStep === 2 && (
            <JobStep2
              data={step2}
              errors={errors}
              onChange={(field, value) => setStep2((prev) => ({ ...prev, [field]: value }))}
            />
          )}
          {currentStep === 3 && (
            <JobStep3
              data={step3}
              errors={errors}
              onChange={(field, value) =>
                setStep3((prev) => ({ ...prev, [field]: value as string & boolean }))
              }
            />
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

        {/* Navigation Buttons */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>

          <div className="flex gap-3">
            {currentStep === TOTAL_STEPS ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Lưu nháp
                </Button>
                <Button onClick={handlePublish} disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Gửi duyệt
                </Button>
              </>
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
