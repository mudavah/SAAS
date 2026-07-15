"use client";

import { cn } from "@/lib/utils";
import { HEALTH_COLORS, type IntegrationHealthStatus } from "./types";

interface HealthIndicatorProps {
  status: IntegrationHealthStatus;
  showLabel?: boolean;
  className?: string;
}

export function HealthIndicator({
  status,
  showLabel = true,
  className,
}: HealthIndicatorProps) {
  const meta = HEALTH_COLORS[status] ?? HEALTH_COLORS.unknown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        className
      )}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}

export function HealthBadge({
  status,
  className,
}: {
  status: IntegrationHealthStatus;
  className?: string;
}) {
  const meta = HEALTH_COLORS[status] ?? HEALTH_COLORS.unknown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        meta.badge,
        className
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
