"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Workflow, Play, Pause, Trash2, Zap, GitBranch } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface CatalogAction { type: string; label: string; description: string; fields: { key: string; label: string; type: string; placeholder?: string; options?: { value: string; label: string }[] }[] }
interface CatalogEvent { type: string; label: string; description: string }
interface WorkflowAction { type: string; name?: string; config: Record<string, unknown> }
interface Workflow { id: string; name: string; description: string | null; status: string; triggerType: string; triggerConfig: any; runCount: number; lastRunStatus: string | null; actions: WorkflowAction[] }

export default function AutomationPage() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [catalog, setCatalog] = useState<{ triggers: CatalogEvent[]; actions: CatalogAction[]; templates: { name: string; description: string; workflow: any }[] }>({ triggers: [], actions: [], templates: [] });
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("event");
  const [triggerEvent, setTriggerEvent] = useState("invoice.created");
  const [cron, setCron] = useState("0 9 * * *");
  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [w, c] = await Promise.all([
        fetch("/api/automation/workflows").then((r) => r.json()),
        fetch("/api/automation/catalog").then((r) => r.json()),
      ]);
      setWorkflows(w.data || []);
      setCatalog(c.data || { triggers: [], actions: [], templates: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function addAction(type: string) {
    setActions((a) => [...a, { type, config: {} }]);
  }
  function updateActionConfig(idx: number, key: string, value: string) {
    setActions((a) => a.map((act, i) => (i === idx ? { ...act, config: { ...act.config, [key]: value } } : act)));
  }
  function removeAction(idx: number) {
    setActions((a) => a.filter((_, i) => i !== idx));
  }

  async function save() {
    if (!name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/automation/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, description, triggerType,
          triggerConfig: triggerType === "event" ? { event: triggerEvent } : triggerType === "schedule" ? { cron, timezone: "Africa/Nairobi" } : {},
          actions: actions.map((a, i) => ({ ...a, order: i })),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast({ title: "Workflow created" });
      setBuilding(false); setActions([]); setName(""); setDescription("");
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function toggle(id: string) {
    await fetch(`/api/automation/workflows/${id}/toggle`, { method: "POST" });
    load();
  }
  async function run(id: string) {
    await fetch(`/api/automation/workflows/${id}/run`, { method: "POST" });
    toast({ title: "Workflow triggered" });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this workflow?")) return;
    await fetch(`/api/automation/workflows/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Workflow className="h-6 w-6 text-kazi-orange" /> Automation</h1>
            <p className="text-muted-foreground">Build Trigger → Action workflows across your business.</p>
          </div>
          <Button variant="kazi" onClick={() => setBuilding((b) => !b)}><Plus className="mr-2 h-4 w-4" />{building ? "Close" : "New Workflow"}</Button>
        </div>

        {building && (
          <Card>
            <CardHeader><CardTitle>Workflow Builder</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Overdue invoice follow-up" />
                </div>
                <div className="space-y-2">
                  <Label>Trigger</Label>
                  <Select value={triggerType} onValueChange={setTriggerType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event">When an event happens</SelectItem>
                      <SelectItem value="schedule">On a schedule</SelectItem>
                      <SelectItem value="manual">Manual only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {triggerType === "event" && (
                <div className="space-y-2">
                  <Label>Business event</Label>
                  <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {catalog.triggers.filter((t) => t.type !== "manual").map((t) => (
                        <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {triggerType === "schedule" && (
                <div className="space-y-2">
                  <Label>Cron expression</Label>
                  <Input value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 9 * * *" />
                  <p className="text-xs text-muted-foreground">minute hour day month weekday · e.g. 0 9 * * * = daily at 09:00</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Actions ({actions.length})</Label>
                  <Select onValueChange={addAction}>
                    <SelectTrigger className="w-56"><SelectValue placeholder="Add action" /></SelectTrigger>
                    <SelectContent>
                      {catalog.actions.map((a) => (
                        <SelectItem key={a.type} value={a.type}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {actions.map((act, idx) => {
                  const meta = catalog.actions.find((a) => a.type === act.type);
                  return (
                    <Card key={idx} className="border-dashed">
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">{meta?.label || act.type}</Badge>
                          <Button variant="ghost" size="sm" onClick={() => removeAction(idx)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        {(meta?.fields || []).slice(0, 4).map((f) => (
                          <div key={f.key} className="space-y-1">
                            <Label className="text-xs">{f.label}</Label>
                            {f.type === "textarea" ? (
                              <Textarea value={(act.config[f.key] as string) || ""} onChange={(e) => updateActionConfig(idx, f.key, e.target.value)} rows={2} placeholder={f.placeholder} />
                            ) : f.type === "select" ? (
                              <Select value={(act.config[f.key] as string) || ""} onValueChange={(v) => updateActionConfig(idx, f.key, v)}>
                                <SelectTrigger><SelectValue placeholder={f.label} /></SelectTrigger>
                                <SelectContent>{f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                              </Select>
                            ) : (
                              <Input value={(act.config[f.key] as string) || ""} onChange={(e) => updateActionConfig(idx, f.key, e.target.value)} placeholder={f.placeholder} />
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Button variant="kazi" onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}Create Workflow</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="grid gap-3">
            {workflows.length === 0 && <p className="text-muted-foreground">No workflows yet. Create one to automate repetitive work.</p>}
            {workflows.map((w) => (
              <Card key={w.id}>
                <CardContent className="py-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{w.name}</p>
                    <p className="text-sm text-muted-foreground">{w.description || `${w.actions.length} action(s)`}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={w.status === "active" ? "default" : "secondary"}>{w.status}</Badge>
                      <Badge variant="outline">{w.triggerType}</Badge>
                      <span className="text-xs text-muted-foreground">runs: {w.runCount}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => run(w.id)}><Play className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => toggle(w.id)}>{w.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
                    <Button variant="outline" size="sm" onClick={() => remove(w.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
