"use client";

import { useEffect } from "react";
import { useGuidedTour } from "@/components/ux/guided-tour";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const DASHBOARD_TOUR = [
  { target: "stats-pending", title: "Track what's owed", content: "Pending invoices are sent but unpaid. Click any to send a reminder." },
  { target: "stats-clients", title: "Your customers", content: "Add clients once, then reuse them on every invoice." },
  { target: "stats-revenue", title: "Monthly revenue", content: "Revenue updates automatically as payments settle via M-Pesa or card." },
  { target: "stats-net", title: "Net profit", content: "Revenue minus expenses. Keep this positive to grow." },
];

/**
 * Launches the one-time dashboard tour for new users. Replays only if the tour
 * was never completed (persisted in localStorage by the provider).
 */
export function DashboardTourLauncher() {
  const { start, isCompleted } = useGuidedTour();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isCompleted("dashboard-overview")) {
      const t = setTimeout(() => start("dashboard-overview", DASHBOARD_TOUR), 600);
      return () => clearTimeout(t);
    }
  }, [start, isCompleted]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => start("dashboard-overview", DASHBOARD_TOUR)}
      className="gap-2"
      aria-label="Start guided tour"
    >
      <Sparkles className="h-4 w-4" />
      Take a tour
    </Button>
  );
}
