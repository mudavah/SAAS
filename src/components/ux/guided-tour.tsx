"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";

interface TourStep {
  target: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
}

interface GuidedTourContextValue {
  start: (tourId: string, steps: TourStep[]) => void;
  stop: () => void;
  active: boolean;
  currentStep: number;
  steps: TourStep[];
  tourId: string | null;
  next: () => void;
  prev: () => void;
  isCompleted: (tourId: string) => boolean;
}

const GuidedTourContext = createContext<GuidedTourContextValue | null>(null);

/**
 * Lightweight, dependency-free guided tour. Steps reference a DOM element by
 * `data-tour` attribute. Persists completion per tour id so a user only sees a
 * given tour once (unless re-triggered). Purely additive — never blocks the UI.
 */
export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [tourId, setTourId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [active, setActive] = useState(false);
  const [completed, setCompleted] = useLocalStorage<Record<string, boolean>>(
    "kf:tours:completed",
    {}
  );

  const stop = useCallback(() => {
    setActive(false);
    setSteps([]);
    setTourId(null);
    setCurrentStep(0);
  }, []);

  const start = useCallback(
    (id: string, s: TourStep[]) => {
      if (!s.length) return;
      setTourId(id);
      setSteps(s);
      setCurrentStep(0);
      setActive(true);
    },
    []
  );

  const next = useCallback(() => {
    setCurrentStep((c) => {
      if (c >= steps.length - 1) {
        if (tourId) setCompleted((prev) => ({ ...prev, [tourId]: true }));
        stop();
        return c;
      }
      return c + 1;
    });
  }, [steps.length, tourId, setCompleted, stop]);

  const prev = useCallback(() => {
    setCurrentStep((c) => Math.max(0, c - 1));
  }, []);

  const isCompleted = useCallback((id: string) => !!completed[id], [completed]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, next, prev, stop]);

  return (
    <GuidedTourContext.Provider
      value={{ start, stop, active, currentStep, steps, tourId, next, prev, isCompleted }}
    >
      {children}
      {active && steps.length > 0 && (
        <TourOverlay
          step={steps[currentStep]}
          index={currentStep}
          total={steps.length}
          onNext={next}
          onPrev={prev}
          onClose={stop}
        />
      )}
    </GuidedTourContext.Provider>
  );
}

export function useGuidedTour() {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) throw new Error("useGuidedTour must be used within GuidedTourProvider");
  return ctx;
}

function TourOverlay({
  step,
  index,
  total,
  onNext,
  onPrev,
  onClose,
}: {
  step: TourStep;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect(r);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setRect(null);
    }
  }, [step.target]);

  const top = rect ? rect.bottom + 12 : window.innerHeight / 2;
  const left = rect ? Math.min(Math.max(rect.left, 16), window.innerWidth - 340) : 16;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={step.title}>
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      {rect && (
        <div
          className="absolute rounded-lg ring-2 ring-kazi-green ring-offset-2 ring-offset-background pointer-events-none transition-all"
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      )}
      <div
        className="absolute w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border bg-background p-4 shadow-xl"
        style={{ top, left }}
        role="document"
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Step {index + 1} of {total}
          </span>
          <button
            onClick={onClose}
            aria-label="Skip tour"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
        </div>
        <h3 className="text-sm font-semibold">{step.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{step.content}</p>
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={onPrev}
            disabled={index === 0}
            className="text-sm text-muted-foreground disabled:opacity-40"
          >
            Back
          </button>
          <button
            onClick={onNext}
            className="rounded-lg bg-kazi-green px-3 py-1.5 text-sm font-medium text-white"
          >
            {index === total - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
