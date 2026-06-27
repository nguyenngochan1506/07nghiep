import { Check, X } from "lucide-react";

type StepKey = "PENDING" | "VIEWED" | "SHORTLISTED" | "INTERVIEWING" | "OFFERED";

const STEP_ORDER: StepKey[] = ["PENDING", "VIEWED", "SHORTLISTED", "INTERVIEWING", "OFFERED"];

export interface ApplicationStatusTrackerProps {
  currentStatus: string; // ApplicationStatus
  // Optional: when terminal (REJECTED/WITHDRAWN) we can provide the last successful step
  lastKnownStep?: StepKey;
}

export function ApplicationStatusTracker({
  currentStatus,
  lastKnownStep,
}: ApplicationStatusTrackerProps) {
  const terminal = currentStatus === "REJECTED" || currentStatus === "WITHDRAWN";

  // Determine the active index for normal statuses
  const activeIndex = STEP_ORDER.indexOf(currentStatus as StepKey);

  // For terminal statuses, place the red X at the step after lastKnownStep (if provided), else on first step
  const terminalIndex = terminal
    ? lastKnownStep
      ? Math.min(STEP_ORDER.indexOf(lastKnownStep) + 1, STEP_ORDER.length - 1)
      : 0
    : -1;

  return (
    <div className="w-full">
      <div className="flex items-center gap-4">
        {STEP_ORDER.map((step, idx) => {
          const isCompleted = !terminal && activeIndex > idx;
          const isActive = !terminal && activeIndex === idx;
          const isUpcoming = !terminal && activeIndex < idx;

          const showGreenCheck = isCompleted;
          const showBlueActive = isActive;
          const showGray = isUpcoming;

          // Terminal visuals
          const showTerminalX = terminal && terminalIndex === idx;
          const showTerminalCompleted =
            terminal && lastKnownStep ? STEP_ORDER.indexOf(lastKnownStep) >= idx : false;

          return (
            <div key={step} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                    showGreenCheck || showTerminalCompleted
                      ? "bg-success text-white border-success"
                      : showBlueActive
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20 border-primary"
                        : showGray
                          ? "bg-muted/10 text-muted-foreground border-border"
                          : "bg-muted/10 text-muted-foreground border-border"
                  }`}
                >
                  {showGreenCheck || showTerminalCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : showBlueActive ? (
                    <span className="text-sm font-medium">{idx + 1}</span>
                  ) : showTerminalX ? (
                    <X className="h-5 w-5 text-destructive" />
                  ) : (
                    <span className="text-sm font-medium">{idx + 1}</span>
                  )}
                </div>
                <div className="mt-2 w-28 text-center text-xs text-muted-foreground">{step}</div>
              </div>

              {idx < STEP_ORDER.length - 1 ? (
                <div
                  className={`-ml-2 h-1 w-16 flex-1 self-center rounded-full ${
                    showGreenCheck || showTerminalCompleted
                      ? "bg-success"
                      : showBlueActive
                        ? "bg-primary"
                        : "bg-border"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ApplicationStatusTracker;
