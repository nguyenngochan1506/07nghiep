import { useState, useEffect, useCallback } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, ArrowLeft, ArrowRight, Send } from "lucide-react";

import { Button } from "@07nghiep/ui/components/button";
import { Card } from "@07nghiep/ui/components/card";
import { Skeleton } from "@07nghiep/ui/components/skeleton";

import { authorizedRoles } from "@/lib/role-guard";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { JobFormStepper } from "@/components/jobs/job-form-stepper";
import { JobStep1, type Step1Data } from "@/components/jobs/job-step-1";
import { JobStep2, type Step2Data } from "@/components/jobs/job-step-2";
import { JobStep3, type Step3Data } from "@/components/jobs/job-step-3";
import { JobStep4, type Step4Data } from "@/components/jobs/job-step-4";
import { JobPreview } from "@/components/jobs/job-preview";

const TOTAL_STEPS = 5;

type FormErrors = Partial<Record<string, string>>;

export const Route = createFileRoute("/my-jobs/$jobId/edit")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) redirect({ to: "/login", throw: true });
    const role = (session.data!.user as { role?: string }).role ?? "CANDIDATE";
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

  const [errors, setErrors] = useState<FormErrors>({});

  // ── Load Job Data ─────────────────────────────────────────────────────────
  const jobQuery = useQuery(trpc.job.getById.queryOptions({ id: jobId }));
  
  // ── Load Moderation Feedback (if any) ────────────────────────────────────
  const feedbackQuery = useQuery(trpc.job.getModerationFeedback.queryOptions({ jobId }));

  useEffect(() => {
    if (jobQuery.data) {
      const job = jobQuery.data;
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
  const updateMutation = useMutation(
    trpc.job.update.mutationOptions({
      onSuccess: () => {
        toast.success("Cập nhật thành công!");
        navigate({ to: "/my-jobs" });
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const publishMutation = useMutation(
    trpc.job.publish.mutationOptions({
      onSuccess: () => {
        toast.success("Đã gửi tin tuyển dụng để kiểm duyệt!");
        navigate({ to: "/my-jobs" });
      },
      onError: (err) => toast.error(err.message),
    })
  );

  function handleSave(status?: "DRAFT" | "OPEN") {
    const payload = {
      id: jobId,
      title: step1.title,
      jobType: step1.jobType as any,
      workType: step1.workType as any,
      experienceLevel: step1.experienceLevel as any,
      location: step1.location,
      description: step2.description,
      requirements: step2.requirements || undefined,
      benefits: step2.benefits || undefined,
      skills: step2.skills,
      salaryNegotiable: step3.salaryNegotiable,
      salaryType: step3.salaryType ? (step3.salaryType as any) : undefined,
      salaryMin: step3.salaryMin ? Number(step3.salaryMin) : undefined,
      salaryMax: step3.salaryMax ? Number(step3.salaryMax) : undefined,
      expiresAt: step4.expiresAt ? new Date(step4.expiresAt) : undefined,
    };
    
    // If publishing (status = OPEN), first update then publish
    if (status === "OPEN") {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          // After update success, call publish
          publishMutation.mutate({ id: jobId });
        },
      });
    } else {
      // Just update with status if provided
      updateMutation.mutate({
        ...payload,
        ...(status ? { status } : {}),
      });
    }
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

        {/* Admin Feedback Banner */}
        {feedbackQuery.data && (feedbackQuery.data.action === "REJECT" || feedbackQuery.data.action === "REQUEST_CHANGES") && (
          <div className="mb-6 rounded-lg border-2 border-warning bg-warning/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-warning text-warning-foreground">
                {feedbackQuery.data.action === "REJECT" ? "✕" : "!"}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-warning-foreground">
                  {feedbackQuery.data.action === "REJECT" ? "Tin tuyển dụng bị từ chối" : "Yêu cầu chỉnh sửa"}
                </h3>
                {feedbackQuery.data.reason && (
                  <p className="mt-1 text-sm">
                    <span className="font-medium">Lý do:</span> {feedbackQuery.data.reason}
                  </p>
                )}
                {feedbackQuery.data.feedback && (
                  <p className="mt-1 text-sm">
                    <span className="font-medium">Góp ý:</span> {feedbackQuery.data.feedback}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Vui lòng chỉnh sửa theo góp ý và gửi lại để kiểm duyệt
                </p>
              </div>
            </div>
          </div>
        )}

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
              onChange={(field, value) => setStep2((prev) => ({ ...prev, [field]: value as any }))}
            />
          )}
          {currentStep === 3 && (
            <JobStep3
              data={step3}
              errors={errors}
              onChange={(field, value) => setStep3((prev) => ({ ...prev, [field]: value as any }))}
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
                disabled={updateMutation.isPending || publishMutation.isPending}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Gửi kiểm duyệt
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
