import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Reusable empty-state surface for dashboards. Provides a consistent, friendly
 * "nothing here yet" pattern with an icon, message, optional action, and an
 * optional illustrative illustration slot.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  children,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-kazi-green/10 text-kazi-green">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
      {children && <div className="mt-4 w-full">{children}</div>}
    </div>
  );
}
