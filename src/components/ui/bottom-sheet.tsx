"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 80;

interface BottomSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  showClose?: boolean;
  className?: string;
}

/**
 * Accessible bottom sheet built on the @radix-ui/react-dialog primitive.
 * Supports swipe-to-dismiss on touch devices. Slides up from the bottom
 * edge and sticks to the safe area on notched devices.
 */
export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  showClose = true,
  className,
}: BottomSheetProps) {
  const [offset, setOffset] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const startY = React.useRef<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    startY.current = e.clientY;
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    const delta = e.clientY - startY.current;
    setOffset(Math.max(0, delta));
  };

  const handlePointerUp = () => {
    if (startY.current === null) return;
    setDragging(false);
    if (offset > SWIPE_THRESHOLD) {
      onOpenChange?.(false);
    }
    setOffset(0);
    startY.current = null;
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ transform: offset ? `translateY(${offset}px)` : undefined }}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90vh] flex-col rounded-t-2xl border bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lg outline-none",
            dragging ? "transition-none" : "transition-transform duration-300 ease-out"
          , className)}
        >
          <div
            className="mx-auto mb-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30"
            aria-hidden="true"
          />

          {(title || showClose) && (
            <div className="mb-2 flex items-center justify-between gap-2">
              {title ? (
                <DialogPrimitive.Title className="text-base font-semibold">
                  {title}
                </DialogPrimitive.Title>
              ) : (
                <DialogPrimitive.Title className="sr-only">
                  Menu
                </DialogPrimitive.Title>
              )}
              {showClose && (
                <DialogPrimitive.Close
                  aria-label="Close"
                  className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-transform active:scale-90 touch-manipulation"
                >
                  <X className="h-5 w-5" />
                </DialogPrimitive.Close>
              )}
            </div>
          )}

          {description && (
            <DialogPrimitive.Description className="mb-3 text-sm text-muted-foreground">
              {description}
            </DialogPrimitive.Description>
          )}

          <div className="flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const BottomSheetTrigger = DialogPrimitive.Trigger;
export const BottomSheetClose = DialogPrimitive.Close;
