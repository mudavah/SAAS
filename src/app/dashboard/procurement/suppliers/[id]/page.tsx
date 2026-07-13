"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Star, Package } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

interface Perf {
  supplierId: string; name: string; totalSpend: number; poCount: number;
  onTimeDeliveryRate: number; avgLeadTimeDays: number | null;
  qualityRate: number; openBalance: number; rating: number | null;
  balance: { totalBilled: number; totalPaid: number; totalReturns: number; balance: number };
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [perf, setPerf] = useState<Perf | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/procurement/suppliers/${id}/performance`)
      .then((r) => r.json())
      .then((d) => (d.error ? setPerf(null) : setPerf(d)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (<DashboardShell><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></DashboardShell>);
  if (!perf) return (<DashboardShell><div className="text-center py-16"><p className="text-muted-foreground mb-4">Supplier not found</p><Link href="/dashboard/procurement/suppliers"><Button variant="outline">Back</Button></Link></div></DashboardShell>);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/procurement/suppliers"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-5 w-5 text-kazi-green" />{perf.name}</h1>
            {perf.rating != null && (<span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Star className="h-4 w-4" />{perf.rating}/5</span>)}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Spend</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(perf.totalSpend)}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Open Balance</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-kazi-orange">{formatCurrency(perf.balance.balance)}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">On-Time Delivery</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{perf.onTimeDeliveryRate}%</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Quality Rate</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{perf.qualityRate}%</div></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle>Performance</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Purchase Orders</span><span className="font-semibold">{perf.poCount}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Avg Lead Time</span><span className="font-semibold">{perf.avgLeadTimeDays != null ? `${perf.avgLeadTimeDays} days` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Billed</span><span className="font-semibold">{formatCurrency(perf.balance.totalBilled)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Paid</span><span className="font-semibold">{formatCurrency(perf.balance.totalPaid)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Returns</span><span className="font-semibold">{formatCurrency(perf.balance.totalReturns)}</span></div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Actions</CardTitle></CardHeader><CardContent className="space-y-2">
            <Link href="/dashboard/procurement/orders"><Button variant="outline" className="w-full justify-start">Create Purchase Order</Button></Link>
            <Link href="/dashboard/procurement/invoices"><Button variant="outline" className="w-full justify-start">Record Invoice</Button></Link>
            <Link href="/dashboard/procurement/payments"><Button variant="outline" className="w-full justify-start">Record Payment</Button></Link>
          </CardContent></Card>
        </div>
      </div>
    </DashboardShell>
  );
}
