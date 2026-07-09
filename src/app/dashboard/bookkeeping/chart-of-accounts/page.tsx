"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  parent: { name: string } | null;
  isActive: boolean;
}

export default function ChartOfAccountsPage() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookkeeping/accounts")
      .then((r) => r.json())
      .then(setAccounts)
      .finally(() => setLoading(false));
  }, []);

  const typeColors: Record<string, "default" | "success" | "warning" | "destructive" | "info"> = {
    asset: "info",
    liability: "warning",
    equity: "default",
    income: "success",
    expense: "destructive",
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Chart of Accounts</h1>
          <p className="text-muted-foreground">Manage your accounting structure</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-kazi-green" />
          </div>
        ) : (
          <div className="border rounded-xl bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Code</th>
                    <th className="text-left p-4 font-medium">Account Name</th>
                    <th className="text-left p-4 font-medium hidden sm:table-cell">Type</th>
                    <th className="text-center p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-4 font-mono text-sm">{account.code}</td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{account.name}</p>
                          {account.parent?.name && (
                            <p className="text-xs text-muted-foreground">{account.parent.name}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <Badge variant={typeColors[account.type] || "default"} className="capitalize">
                          {account.type}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant={account.isActive ? "success" : "default"} className="capitalize">
                          {account.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
