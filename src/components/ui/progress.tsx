import * as React from "react";
import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<"div"> & { value?: number }) {
  return (
    <div
      role="progressbar"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      data-state={value === undefined ? "indeterminate" : "determinate"}
      data-value={value ?? undefined}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${value ?? 0}%` }}
      />
    </div>
  );
}

export { Progress };
