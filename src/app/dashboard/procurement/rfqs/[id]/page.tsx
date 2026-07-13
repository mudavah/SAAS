"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Send, Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface Rfq {
  id: string; rfqNumber: string; title: string; status: string;
  validUntil: string | null; notes: string | null;
  items: { id: string; description: string; quantity: string; unit: string }[];
  suppliers: { id: string; name: string }[];
}

export default function RfqDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/procurement/rfqs/${id}`).then((r) => r.json()).then((d) => (d.error ? setRfq(null) : setRfq(d))).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [id]);

  async function send() {
    setBusy(true);
    try {
      const res = await fetch(`/api/procurement/rfqs/${id}/send`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) { toast({ title: "Could not send", description: d.error, variant: "destructive" }); return; }
      toast({ title: "RFQ sent to suppliers" }); load();
    } finally { setBusy(false); }
  }

  if (loading) return (<DashboardShell><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></DashboardShell>);
  if (!rfq) return (<DashboardShell><div className="text-center py-16"><p className="text-muted-foreground mb-4">RFQ not found</p><Link href="/dashboard/procurement/rfqs"><Button variant="outline">Back</Button></Link></div></DashboardShell>);

  const quoteHref = "/dashboard/procurement/quotations?rfq=" + rfq.id;

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/procurement/rfqs"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="flex-1">
            <div className="flex items-center gap-2"><h1 className="text-2xl font-bold">{rfq.title}</h1><Badge>{rfq.status}</Badge></div>
            <p className="text-sm text-muted-foreground">{rfq.rfqNumber}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {rfq.status === "draft" && (<Button variant="kazi" onClick={send} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Send to Suppliers</Button>)}
          <Button variant="outline" onClick={() => router.push(quoteHref)}><Plus className="mr-2 h-4 w-4" /> Record Quotation</Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle>Items</CardTitle></CardHeader><CardContent className="space-y-2">
            {rfq.items.map((it) => (<div key={it.id} className="flex justify-between p-2 rounded-lg bg-muted/40 text-sm"><span>{it.description}</span><span className="text-muted-foreground">{it.quantity} {it.unit}</span></div>))}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Suppliers</CardTitle></CardHeader><CardContent className="space-y-2">
            {rfq.suppliers.map((s) => (<div key={s.id} className="p-2 rounded-lg bg-muted/40 text-sm">{s.name}</div>))}
          </CardContent></Card>
        </div>
      </div>
    </DashboardShell>
  );
}
