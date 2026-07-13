"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  /** Distance (px) the user must pull before a refresh triggers. */
  threshold?: number;
  /** Controlled refreshing state (optional). */
  refreshing?: boolean;
}

/**
 * Mobile pull-to-refresh wrapper. Only engages when the scroll container is
 * already at the top, so it never interferes with normal list scrolling.
 */
export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 70,
  refreshing,
}: PullToRefreshProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const startY = React.useRef<number | null>(null);
  const [pull, setPull] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const isLoading = refreshing ?? loading;

  const onTouchStart = (e: React.TouchEvent) => {
    if (isLoading) return;
    const el = containerRef.current;
    if (el && el.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const el = containerRef.current;
    if (el && el.scrollTop > 0) {
      startY.current = null;
      setPull(0);
      return;
    }
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setPull(Math.min(delta * 0.5, threshold + 24));
    }
  };

  const onTouchEnd = async () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= threshold) {
      setLoading(true);
      try {
        await onRefresh();
      } finally {
        setLoading(false);
      }
    }
    setPull(0);
  };

  const indicatorHeight = isLoading ? 40 : pull;
  const spinning = isLoading || pull > threshold;

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={cn("relative h-full overflow-y-auto overscroll-y-contain", className)}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
        style={{ height: indicatorHeight }}
        aria-hidden="true"
      >
        <RefreshCw
          className={cn(
            "h-5 w-5 text-muted-foreground",
            spinning && "animate-spin"
          )}
        />
      </div>
      <div
        style={{
          transform: pull ? `translateY(${pull}px)` : undefined,
          transition: startY.current === null ? "transform 0.2s ease-out" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
