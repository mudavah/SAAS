import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

export default async function ProcurementPage() {
  const ctx = await getPageContext({ requiredPermission: "enterprise.view" });
  if (!ctx) throw new Error("Unauthorized");

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/enterprise/procurement`, {
    headers: { cookie: "" },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({ data: [] }));

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Centralized Procurement</h1>
          <p className="text-muted-foreground mt-1">Organization-wide purchase orders and suppliers</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total POs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.data?.length ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-kazi-green" />
              Procurement Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Centralized procurement allows you to manage purchase orders across all branches from a single view.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
