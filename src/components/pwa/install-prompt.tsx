"use client";

import * as React from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "kaziflow-install-dismissed";

/**
 * Handles the native install prompt (beforeinstallprompt) and shows iOS
 * "Add to Home Screen" guidance for Safari/iOS where the prompt is
 * unavailable. Honors a per-browser dismissal flag.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [visible, setVisible] = React.useState(false);
  const [iosHint, setIosHint] = React.useState(false);

  React.useEffect(() => {
    const ua = window.navigator.userAgent;
    const isIos =
      /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt as EventListener);

    if (!dismissed && !isStandalone) {
      if (isIos) {
        setIosHint(true);
        setVisible(true);
      } else if (deferred) {
        setVisible(true);
      }
    }

    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        onPrompt as EventListener
      );
  }, [deferred]);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "accepted") setVisible(false);
  };

  const dismiss = () => {
    setVisible(false);
    setIosHint(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-card p-3 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-kazi-green text-sm font-bold text-white">
          KF
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install KaziFlow</p>
          <p className="truncate text-xs text-muted-foreground">
            {iosHint
              ? "Tap Share, then 'Add to Home Screen'"
              : "Get quick access & offline mode"}
          </p>
        </div>
        {!iosHint && deferred && (
          <Button
            variant="kazi"
            size="sm"
            className="shrink-0"
            onClick={install}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Install
          </Button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-transform active:scale-90 touch-manipulation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
