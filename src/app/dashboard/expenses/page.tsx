"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: string;
  date: string;
  taxDeductible: boolean;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    fetch("/api/expenses")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load expenses");
        return r.json();
      })
      .then(setExpenses)
      .catch(() => {});
  }, []);

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Expenses</h1>
            <p className="text-muted-foreground">Track business spending · Total: {formatCurrency(total)}</p>
          </div>
          <Link href="/dashboard/expenses/new">
            <Button variant="kazi"><Plus className="mr-2 h-4 w-4" />Log Expense</Button>
          </Link>
        </div>

        <div className="border rounded-xl bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">Date</th>
                <th className="text-left p-4 font-medium">Category</th>
                <th className="text-left p-4 font-medium hidden sm:table-cell">Description</th>
                <th className="text-right p-4 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No expenses logged</td></tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="p-4">{formatDate(e.date)}</td>
                    <td className="p-4">
                      {e.category}
                      {e.taxDeductible && <Badge variant="info" className="ml-2 text-xs">Tax</Badge>}
                    </td>
                    <td className="p-4 hidden sm:table-cell text-muted-foreground">{e.description}</td>
                    <td className="p-4 text-right font-medium">{formatCurrency(e.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
