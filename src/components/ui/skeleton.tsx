import { cn } from "@/lib/utils";

/** Base shimmer block used by all skeletons. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

/** Stat-card skeleton for dashboard KPI placeholders. */
export function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  );
}

/** Table skeleton for list/table loading states. */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3" aria-hidden>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-10", c === 0 ? "flex-1" : "w-24")} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Page header skeleton. */
export function SkeletonHeader() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}
