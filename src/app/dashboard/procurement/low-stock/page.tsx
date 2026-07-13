"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Plus, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

interface LowStock {
  productId: string; name: string; quantity: string; unit: string;
  minStockLevel: string; reorderPoint: string | null; suggestedQty: number;
  estimatedCost: number; recommendedSupplierId: string | null;
  recommendedSupplierName: string | null;
}

export default function LowStockPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<LowStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/procurement/low-stock")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  function createRequest(name: string) {
    toast({ title: "Suggestion noted", description: `Create a purchase request for ${name} from Requests.` });
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Low Stock Suggestions</h1>
            <p className="text-muted-foreground">AI-driven reorder recommendations</p>
          </div>
          <Button variant="outline" onClick={() => toast({ title: "Generating…" })}>
            <Sparkles className="mr-2 h-4 w-4" /> See AI Recommendations
          </Button>
        </div>

        {loading ? (<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>) :
          items.length === 0 ? (<div className="text-center py-16 border rounded-xl bg-card"><AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-30" /><p className="text-muted-foreground mb-4">All stock levels healthy</p></div>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((p) => (
              <Card key={p.productId}><CardContent className="pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.quantity} {p.unit} / min {p.minStockLevel}</p></div>
                  <Badge variant="secondary"><AlertTriangle className="mr-1 h-3 w-3" />Low</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Reorder</span>
                  <span className="font-semibold">{p.suggestedQty} {p.unit}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Est. cost</span>
                  <span className="font-semibold">{formatCurrency(p.estimatedCost)}</span>
                </div>
                {p.recommendedSupplierName && (
                  <p className="text-xs text-muted-foreground mt-2">Suggested supplier: {p.recommendedSupplierName}</p>
                )}
                <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => createRequest(p.name)}>
                  <Plus className="mr-1 h-3 w-3" /> Reorder
                </Button>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
