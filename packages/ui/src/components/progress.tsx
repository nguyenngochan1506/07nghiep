import { cn } from "@07nghiep/ui/lib/utils";
import type * as React from "react";

type ProgressProps = React.ComponentProps<"div"> & {
  value?: number;
};

function Progress({ className, value = 0, ...props }: ProgressProps) {
  const normalizedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      data-slot="progress"
      className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${normalizedValue}%` }}
      />
    </div>
  );
}

export { Progress };
