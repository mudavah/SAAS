"use client";

import { useState, type ReactNode } from "react";
import { HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline contextual help popover. Attach next to a heading or control to give
 * just-in-time guidance without leaving the page. Keyboard accessible (button
 * toggles, Escape closes, focus returns to trigger).
 */
export function ContextualHelp({
  content,
  label = "Help",
  side = "right",
  children,
}: {
  content: ReactNode;
  label?: string;
  side?: "top" | "right" | "bottom" | "left";
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const pos: Record<string, string> = {
    right: "left-full ml-2 top-0",
    left: "right-full mr-2 top-0",
    top: "bottom-full mb-2 left-0",
    bottom: "top-full mt-2 left-0",
  };

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {children ?? <HelpCircle className="h-4 w-4" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="tooltip"
            className={cn(
              "absolute z-50 w-64 rounded-lg border bg-popover p-3 text-sm text-popover-foreground shadow-lg",
              pos[side]
            )}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold">{label}</span>
              <button
                type="button"
                aria-label="Close help"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="text-muted-foreground">{content}</div>
          </div>
        </>
      )}
    </span>
  );
}
