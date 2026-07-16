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

/**
 * Table-shaped skeleton that mirrors a real data table: a header row plus N
 * body rows, wrapped in the same card chrome as list pages.
 */
export function TableSkeleton({
  rows = 6,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn("border rounded-xl bg-card overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <div className="w-full" role="status" aria-label="Loading">
          <div className="border-b bg-muted/50 p-4">
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <div className="divide-y">
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="flex gap-4 p-4" aria-hidden>
                {Array.from({ length: cols }).map((_, c) => (
                  <Skeleton
                    key={c}
                    className={cn("h-5", c === 0 ? "flex-1 max-w-[200px]" : "w-20")}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Full list-page skeleton: header (title + action) plus a table skeleton,
 * wrapped in DashboardShell for visual parity with the loaded page.
 */
export function PageSkeleton({
  tableRows = 6,
  tableCols = 4,
}: {
  tableRows?: number;
  tableCols?: number;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <TableSkeleton rows={tableRows} cols={tableCols} />
    </div>
  );
}
