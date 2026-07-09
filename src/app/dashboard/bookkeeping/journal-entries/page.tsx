"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface JournalEntry {
  id: string;
  date: string;
  description: string;
  status: string;
  lines: Array<{
    account: { name: string; code: string };
    debit: string;
    credit: string;
    description: string | null;
  }>;
}

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookkeeping/journal-entries")
      .then((r) => r.json())
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  const statusColors: Record<string, "default" | "success" | "warning" | "destructive" | "info"> = {
    draft: "default",
    posted: "success",
    reversed: "destructive",
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Journal Entries</h1>
            <p className="text-muted-foreground">Record and track financial transactions</p>
          </div>
          <Button variant="kazi">
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-kazi-green" />
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <p className="text-muted-foreground mb-4">No journal entries yet</p>
              <Button variant="kazi">Create Your First Entry</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{entry.description}</p>
                        <Badge variant={statusColors[entry.status] || "default"} className="capitalize text-xs">
                          {entry.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString("en-KE")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left p-2">Account</th>
                          <th className="text-left p-2">Description</th>
                          <th className="text-right p-2">Debit</th>
                          <th className="text-right p-2">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.lines?.map((line, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="p-2">
                              <span className="font-mono text-xs">{line.account.code}</span>{" "}
                              {line.account.name}
                            </td>
                            <td className="p-2 text-muted-foreground">{line.description || "—"}</td>
                            <td className="p-2 text-right">{parseFloat(line.debit) > 0 ? formatCurrency(line.debit) : "—"}</td>
                            <td className="p-2 text-right">{parseFloat(line.credit) > 0 ? formatCurrency(line.credit) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
