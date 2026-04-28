import { Check } from "lucide-react";
import { cn } from "@07nghiep/ui/lib/utils";

const STEPS = [
  { id: 1, label: "Thông tin cơ bản" },
  { id: 2, label: "Mô tả công việc" },
  { id: 3, label: "Lương & Điều kiện" },
  { id: 4, label: "Thông tin bổ sung" },
  { id: 5, label: "Xem trước & Đăng" },
];

interface JobFormStepperProps {
  currentStep: number;
}

export function JobFormStepper({ currentStep }: JobFormStepperProps) {
  return (
    <nav aria-label="Các bước tạo tin tuyển dụng" className="mb-8">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;

          return (
            <li key={step.id} className="flex flex-1 items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    isActive &&
                      "border-primary bg-background text-primary shadow-md",
                    !isCompleted &&
                      !isActive &&
                      "border-border bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "hidden text-center text-xs font-medium sm:block",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-2 mb-5 h-0.5 flex-1 transition-colors",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
