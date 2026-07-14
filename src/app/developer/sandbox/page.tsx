"use client";

import { useState, useEffect } from "react";
import { Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

type SandboxSession = {
  id: string;
  name: string;
  environment: string;
  metadata: Record<string, unknown>;
  expiresAt: string | null;
  createdAt: string;
};

export default function DeveloperSandboxPage() {
  const [sessions, setSessions] = useState<SandboxSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");

  async function fetchSessions() {
    const res = await fetch("/api/developer/sandbox");
    if (res.ok) {
      const data = await res.json();
      setSessions(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchSessions();
  }, []);

  async function createSession() {
    const res = await fetch("/api/developer/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      setDialogOpen(false);
      setName("");
      fetchSessions();
    }
  }

  async function deleteSession(id: string) {
    if (!confirm("Delete this sandbox session?")) return;
    const res = await fetch(`/api/developer/sandbox/${id}`, { method: "DELETE" });
    if (res.ok) fetchSessions();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sandbox</h1>
          <p className="text-muted-foreground">Manage API sandbox sessions for testing</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button variant="kazi" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Sandbox Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Session Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Test Session" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={createSession} disabled={!name}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="border rounded-xl bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Environment</th>
                  <th className="text-left p-4 font-medium">Expires At</th>
                  <th className="text-left p-4 font-medium">Created</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4 font-medium">{session.name}</td>
                    <td className="p-4">
                      <Badge variant="secondary" className="capitalize">{session.environment}</Badge>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {session.expiresAt ? new Date(session.expiresAt).toLocaleString() : "Never"}
                    </td>
                    <td className="p-4 text-muted-foreground">{new Date(session.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSession(session.id)}
                        className="text-destructive hover:text-destructive h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No sandbox sessions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
