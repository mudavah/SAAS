"use client";

import { useEffect, useState } from "react";
import { Loader2, FileText, Sparkles, Check } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface AiDoc {
  id: string;
  documentType: string;
  status: string;
  title: string | null;
  rationale: string | null;
  payload: any;
  createdResourceType: string | null;
  createdAt: string;
}

const DOC_TYPES = [
  { value: "invoice", label: "Invoice" },
  { value: "quotation", label: "Quotation" },
  { value: "purchase_order", label: "Purchase Order" },
] as const;

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "created") return "default";
  if (s === "draft") return "secondary";
  if (s === "rejected") return "destructive";
  return "outline";
}

export default function AiDocumentsPage() {
  const { toast } = useToast();
  const [docs, setDocs] = useState<AiDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState<string | null>(null);

  const [documentType, setDocumentType] = useState("invoice");
  const [clientId, setClientId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [hint, setHint] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/ai/documents").then((x) => x.json());
      setDocs(r.data || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    setGenerating(true);
    try {
      const body: any = { documentType };
      if (hint.trim()) body.hint = hint.trim();
      if (documentType === "purchase_order") {
        if (supplierId.trim()) body.supplierId = supplierId.trim();
      } else if (clientId.trim()) {
        body.clientId = clientId.trim();
      }
      const res = await fetch("/api/ai/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Error", description: data.error, variant: "destructive" }); return; }
      toast({ title: "Draft generated", description: "Review then commit to create the real record." });
      setHint("");
      load();
    } finally {
      setGenerating(false);
    }
  }

  async function commit(id: string) {
    setCommitting(id);
    try {
      const res = await fetch(`/api/ai/documents/${id}/commit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Error", description: data.error, variant: "destructive" }); return; }
      toast({ title: "Created", description: "Document committed to a live record." });
      load();
    } finally {
      setCommitting(null);
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-kazi-orange" /> AI Documents
          </h1>
          <p className="text-muted-foreground">Generate draft invoices, quotations and purchase orders, then commit them.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Generate a draft</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Document type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {documentType === "purchase_order" ? (
                <div className="space-y-1">
                  <Label>Supplier ID (optional)</Label>
                  <Input value={supplierId} onChange={(e) => setSupplierId(e.target.value)} placeholder="Suggests low-stock reorders" />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label>Client ID (optional)</Label>
                  <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Reuses recent line items" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Hint (optional)</Label>
              <Textarea value={hint} onChange={(e) => setHint(e.target.value)} placeholder="e.g. Monthly retainer for consulting services" />
            </div>
            <Button onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate draft
            </Button>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold mb-2">Drafts & documents</h2>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet.</p>
          ) : (
            <div className="grid gap-2">
              {docs.map((d) => (
                <Card key={d.id}>
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{d.documentType.replace("_", " ")}</Badge>
                        <span className="font-medium">{d.title || "Untitled draft"}</span>
                      </div>
                      <Badge variant={statusVariant(d.status)} className="capitalize">{d.status}</Badge>
                    </div>
                    {d.rationale && <p className="text-sm text-muted-foreground">{d.rationale}</p>}
                    {Array.isArray(d.payload?.items) && d.payload.items.length > 0 && (
                      <ul className="text-xs text-muted-foreground list-disc ml-5">
                        {d.payload.items.slice(0, 5).map((it: any, i: number) => (
                          <li key={i}>{it.description} — {it.quantity} × {it.unitPrice}</li>
                        ))}
                      </ul>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</span>
                      {d.status === "draft" && (
                        <Button size="sm" onClick={() => commit(d.id)} disabled={committing === d.id}>
                          {committing === d.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                          Commit
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
