import { redirect } from "next/navigation";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, GitBranch, Truck, Store, ShoppingCart, BarChart3, ShieldCheck, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const modules = [
  { href: "/dashboard/enterprise/branches", label: "Branches", icon: GitBranch, desc: "Manage locations, managers, and branch settings" },
  { href: "/dashboard/enterprise/transfers", label: "Transfers", icon: Truck, desc: "Inter-branch inventory transfers" },
  { href: "/dashboard/enterprise/sales", label: "Inter-Branch Sales", icon: Store, desc: "Cross-branch sales orders" },
  { href: "/dashboard/enterprise/procurement", label: "Central Procurement", icon: ShoppingCart, desc: "Organization-wide purchasing" },
  { href: "/dashboard/enterprise/reports", label: "Enterprise Reports", icon: BarChart3, desc: "Consolidated reporting & insights" },
  { href: "/dashboard/enterprise/approvals", label: "Branch Approvals", icon: ShieldCheck, desc: "Approval workflows per branch" },
  { href: "/dashboard/enterprise/settings", label: "Enterprise Settings", icon: Settings, desc: "Organization enterprise configuration" },
];

export default async function EnterprisePage() {
  const ctx = await getPageContext({ requiredPermission: "enterprise.view" });
  if (!ctx) redirect("/login");

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Enterprise</h1>
          <p className="text-muted-foreground mt-1">
            Multi-branch management, centralized procurement, and consolidated reporting
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Branches
              </CardTitle>
              <Building2 className="h-4 w-4 text-kazi-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Transfers
              </CardTitle>
              <Truck className="h-4 w-4 text-kazi-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Inter-Branch Sales
              </CardTitle>
              <Store className="h-4 w-4 text-kazi-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                AI Insights
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-kazi-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <Link key={mod.href} href={mod.href}>
              <Card className="h-full hover:shadow-md transition-shadow active:scale-[0.98]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <mod.icon className="h-5 w-5 text-kazi-green" />
                    {mod.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{mod.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
