"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TouchButtonProps extends ButtonProps {
  /** Trigger a light haptic tap via the Vibration API when available. */
  haptic?: boolean;
  /** Stretch the button to fill the available width. */
  fill?: boolean;
}

/**
 * Touch-optimized button that guarantees a minimum 44x44px tap target
 * (Apple/Human Interface + WCAG AA), adds an active scale feedback and is
 * ready for haptic feedback.
 */
export function TouchButton({
  className,
  haptic = true,
  fill,
  children,
  onClick,
  ...props
}: TouchButtonProps) {
  return (
    <Button
      className={cn(
        "min-h-[44px] min-w-[44px] touch-manipulation select-none transition-transform active:scale-95 active:duration-75",
        fill && "w-full",
        className
      )}
      onClick={(e) => {
        if (
          haptic &&
          typeof navigator !== "undefined" &&
          "vibrate" in navigator
        ) {
          navigator.vibrate?.(8);
        }
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
