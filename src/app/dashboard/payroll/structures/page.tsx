"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface SalaryStructure {
  id: string;
  name: string;
  description: string | null;
  type: string;
  isActive: boolean;
  components: {
    id: string;
    name: string;
    type: string;
    amount: string;
    isPercentage: boolean;
    isStatutory: boolean;
  }[];
  assignments?: { employee?: { id: string } }[];
}

export default function SalaryStructuresPage() {
  const { toast } = useToast();
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [componentOpen, setComponentOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("monthly");
  const [isActive, setIsActive] = useState(true);

  const [compName, setCompName] = useState("");
  const [compType, setCompType] = useState("allowance");
  const [compAmount, setCompAmount] = useState("");
  const [compIsPercentage, setCompIsPercentage] = useState(false);
  const [compIsStatutory, setCompIsStatutory] = useState(false);
  const [compSaving, setCompSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payroll/structures");
      const data = await res.json();
      if (Array.isArray(data)) setStructures(data);
    } catch {
      toast({ title: "Error", description: "Failed to load structures", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function reset() {
    setName("");
    setDescription("");
    setType("monthly");
    setIsActive(true);
  }

  async function submit() {
    if (!name.trim()) {
      toast({ title: "Validation", description: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/payroll/structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined, type, isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to create structure", variant: "destructive" });
        return;
      }
      toast({ title: "Structure created" });
      setOpen(false);
      reset();
      load();
    } catch {
      toast({ title: "Error", description: "Failed to create structure", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function addComponent() {
    if (!compName.trim() || !compAmount || !selectedId) {
      toast({ title: "Validation", description: "Component name and amount are required", variant: "destructive" });
      return;
    }
    setCompSaving(true);
    try {
      const res = await fetch(`/api/payroll/structures/${selectedId}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: compName,
          type: compType,
          amount: compAmount,
          isPercentage: compIsPercentage,
          isStatutory: compIsStatutory,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to add component", variant: "destructive" });
        return;
      }
      toast({ title: "Component added" });
      setComponentOpen(false);
      setCompName("");
      setCompAmount("");
      setCompIsPercentage(false);
      setCompIsStatutory(false);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to add component", variant: "destructive" });
    } finally {
      setCompSaving(false);
    }
  }

  async function deleteStructure(id: string) {
    if (!confirm("Delete this salary structure?")) return;
    try {
      const res = await fetch(`/api/payroll/structures/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to delete structure", variant: "destructive" });
        return;
      }
      toast({ title: "Structure deleted" });
      load();
    } catch {
      toast({ title: "Error", description: "Failed to delete structure", variant: "destructive" });
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Salary Structures</h1>
            <p className="text-muted-foreground mt-1">Configure salary structures and components</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
              <Button variant="kazi">
                <Plus className="mr-2 h-4 w-4" />
                New Structure
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Salary Structure</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input id="isActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-input" />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                <Button onClick={submit} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Loading structures...</CardContent>
            </Card>
          ) : structures.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">No salary structures found.</CardContent>
            </Card>
          ) : (
            structures.map((s) => (
              <Card key={s.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{s.name}</h3>
                        <Badge variant="secondary">{s.type}</Badge>
                        <Badge variant={s.isActive ? "default" : "outline"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {(s.assignments?.length ?? 0)} assigned
                        </span>
                      </div>
                      {s.description && (
                        <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                      )}
                      {s.components.length > 0 && (
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-muted-foreground border-b">
                                <th className="pb-2 font-medium">Name</th>
                                <th className="pb-2 font-medium">Type</th>
                                <th className="pb-2 font-medium">Amount</th>
                                <th className="pb-2 font-medium">%</th>
                                <th className="pb-2 font-medium">Statutory</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.components.map((c) => (
                                <tr key={c.id} className="border-b last:border-0">
                                  <td className="py-2">{c.name}</td>
                                  <td className="py-2"><Badge variant="outline">{c.type}</Badge></td>
                                  <td className="py-2">{Number(c.amount).toLocaleString()}</td>
                                  <td className="py-2">{c.isPercentage ? "Yes" : "No"}</td>
                                  <td className="py-2">{c.isStatutory ? "Yes" : "No"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Dialog open={componentOpen && selectedId === s.id} onOpenChange={(v) => { setComponentOpen(v); if (v) setSelectedId(s.id); }}>
                      <DialogTrigger>
                        <Button variant="outline" size="sm">
                          <Plus className="mr-1 h-4 w-4" /> Component
                        </Button>
                      </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Component</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="compName">Name</Label>
                              <Input id="compName" value={compName} onChange={(e) => setCompName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="compType">Type</Label>
                              <Select value={compType} onValueChange={setCompType}>
                                <SelectTrigger id="compType">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="earnings">Earnings</SelectItem>
                                  <SelectItem value="allowance">Allowance</SelectItem>
                                  <SelectItem value="deduction">Deduction</SelectItem>
                                  <SelectItem value="tax_paye">PAYE</SelectItem>
                                  <SelectItem value="tax_nssf">NSSF</SelectItem>
                                  <SelectItem value="tax_nhif">NHIF</SelectItem>
                                  <SelectItem value="tax_pension">Pension</SelectItem>
                                  <SelectItem value="tax_housing_levy">Housing Levy</SelectItem>
                                  <SelectItem value="overtime">Overtime</SelectItem>
                                  <SelectItem value="bonus">Bonus</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="compAmount">Amount</Label>
                              <Input id="compAmount" type="number" value={compAmount} onChange={(e) => setCompAmount(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <input id="compPct" type="checkbox" checked={compIsPercentage} onChange={(e) => setCompIsPercentage(e.target.checked)} className="h-4 w-4 rounded border-input" />
                                <Label htmlFor="compPct">Percentage</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <input id="compStat" type="checkbox" checked={compIsStatutory} onChange={(e) => setCompIsStatutory(e.target.checked)} className="h-4 w-4 rounded border-input" />
                                <Label htmlFor="compStat">Statutory</Label>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setComponentOpen(false)} disabled={compSaving}>Cancel</Button>
                            <Button onClick={addComponent} disabled={compSaving}>
                              {compSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Add
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button variant="destructive" size="sm" onClick={() => deleteStructure(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
