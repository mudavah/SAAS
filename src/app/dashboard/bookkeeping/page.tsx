import { auth } from "@/lib/auth";
import { db } from "@/db";
import { chartOfAccounts, journalEntries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BookOpen, FileText, ArrowUpRight, Plus, Wallet } from "lucide-react";

async function getBookkeepingStats(userId: string) {
  const [accounts, entries] = await Promise.all([
    db.select().from(chartOfAccounts).where(eq(chartOfAccounts.userId, userId)),
    db.select().from(journalEntries).where(eq(journalEntries.userId, userId)),
  ]);

  const totalDebit = entries.reduce((sum, entry) => {
    const entryLines = (entry as any).lines || [];
    return sum + entryLines.reduce((lineSum: number, line: any) => lineSum + parseFloat(line.debit || "0"), 0);
  }, 0);

  return {
    totalAccounts: accounts.length,
    totalEntries: entries.length,
    totalDebit,
  };
}

export default async function BookkeepingPage() {
  const session = await auth();
  const stats = await getBookkeepingStats(session!.user!.id);

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Bookkeeping</h1>
            <p className="text-muted-foreground mt-1">
              Manage your accounts and journal entries
            </p>
          </div>
          <Link href="/dashboard/bookkeeping/journal-entries">
            <Button variant="kazi">
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Accounts
              </CardTitle>
              <BookOpen className="h-4 w-4 text-kazi-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAccounts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Journal Entries
              </CardTitle>
              <FileText className="h-4 w-4 text-kazi-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEntries}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Debit
              </CardTitle>
              <Wallet className="h-4 w-4 text-kazi-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("en-KE", {
                  style: "currency",
                  currency: "KES",
                  minimumFractionDigits: 0,
                }).format(stats.totalDebit)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Chart of Accounts</CardTitle>
              <Link href="/dashboard/bookkeeping/chart-of-accounts">
                <Button variant="ghost" size="sm">
                  View all <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your chart of accounts is set up with default Kenyan SME accounts.
                Add custom accounts as needed.
              </p>
              <Link href="/dashboard/bookkeeping/chart-of-accounts">
                <Button variant="outline" className="w-full mt-4">
                  Manage Accounts
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/bookkeeping/journal-entries" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  New Journal Entry
                </Button>
              </Link>
              <Link href="/dashboard/bookkeeping/chart-of-accounts" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Chart of Accounts
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
