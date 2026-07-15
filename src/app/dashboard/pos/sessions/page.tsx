"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Clock, Play, Square, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { logger } from "@/lib/logger";

export default function PosSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [openingFloat, setOpeningFloat] = useState("0");
  const [closingFloat, setClosingFloat] = useState("0");
  const [cashDeposited, setCashDeposited] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await fetch("/api/pos/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.recent || []);
        setActiveSession(data.active);
      }
    } catch (e) {
      logger.error("Failed to load sessions:", { error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSession = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/pos/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingFloat: Number(openingFloat), notes: "" }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to open session");
      }

      toast({ title: "Shift opened successfully" });
      setShowOpenDialog(false);
      setOpeningFloat("0");
      loadSessions();
    } catch (error) {
      toast({
        title: "Error opening shift",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/pos/sessions/${activeSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closingFloat: Number(closingFloat),
          cashDeposited: Number(cashDeposited),
          notes: "",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to close session");
      }

      toast({ title: "Shift closed successfully" });
      setShowCloseDialog(false);
      loadSessions();
    } catch (error) {
      toast({
        title: "Error closing shift",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cashier Shifts</h1>
        <p className="text-muted-foreground">Manage your POS sessions and cash floats</p>
      </div>

      {activeSession ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-kazi-green" />
              Active Shift
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Terminal</p>
                <p className="font-medium">{activeSession.terminalName || "Default Terminal"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opened At</p>
                <p className="font-medium">
                  {new Date(activeSession.openedAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opening Float</p>
                <p className="font-medium">{formatCurrency(Number(activeSession.openingFloat))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="default" className="bg-kazi-green">
                  Open
                </Badge>
              </div>
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowCloseDialog(true)}
            >
              <Square className="mr-2 h-4 w-4" />
              Close Shift
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Active Shift</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Open a cashier shift to start processing sales at the POS.
            </p>
            <Button variant="kazi" onClick={() => setShowOpenDialog(true)}>
              <Play className="mr-2 h-4 w-4" />
              Open New Shift
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent shifts</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{session.terminalName || "Default Terminal"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.openedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        session.status === "open"
                          ? "default"
                          : session.status === "closed"
                          ? "secondary"
                          : "outline"
                      }
                      className={session.status === "open" ? "bg-kazi-green" : ""}
                    >
                      {session.status}
                    </Badge>
                    {session.closingFloat && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Closed: {formatCurrency(Number(session.closingFloat))}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Session Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open New Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Opening Float (KES)</Label>
              <Input
                type="number"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowOpenDialog(false)}>
                Cancel
              </Button>
              <Button variant="kazi" className="flex-1" onClick={handleOpenSession} disabled={isSubmitting}>
                {isSubmitting ? "Opening..." : "Open Shift"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Session Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Closing Float (KES)</Label>
              <Input
                type="number"
                value={closingFloat}
                onChange={(e) => setClosingFloat(e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div>
              <Label>Cash Deposited (KES)</Label>
              <Input
                type="number"
                value={cashDeposited}
                onChange={(e) => setCashDeposited(e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCloseDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleCloseSession} disabled={isSubmitting}>
                {isSubmitting ? "Closing..." : "Close Shift"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
