"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Building2, Plus, GitBranch, MapPin, Phone, Mail } from "lucide-react";
import type { EnterpriseBranch, BranchStatus, BranchType } from "@/db/schema";

const STATUS_COLORS: Record<BranchStatus, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-700",
  suspended: "bg-red-100 text-red-700",
  closing: "bg-yellow-100 text-yellow-700",
};

const TYPE_COLORS: Record<BranchType, string> = {
  head_office: "bg-purple-100 text-purple-700",
  retail: "bg-blue-100 text-blue-700",
  warehouse: "bg-orange-100 text-orange-700",
  office: "bg-gray-100 text-gray-700",
  factory: "bg-red-100 text-red-700",
  other: "bg-gray-100 text-gray-700",
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<EnterpriseBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/enterprise/branches")
      .then((r) => r.json())
      .then((data) => {
        setBranches(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Branches</h1>
            <p className="text-muted-foreground mt-1">Manage your organization branches</p>
          </div>
          <Button variant="kazi" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Branch
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : branches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No branches yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((branch) => (
              <a key={branch.id} href={`/dashboard/enterprise/branches/${branch.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow active:scale-[0.98] cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate">{branch.name}</span>
                      {branch.isDefault && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <GitBranch className="h-3.5 w-3.5" />
                      <span className="font-mono">{branch.code}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className={STATUS_COLORS[branch.status as BranchStatus]}>
                        {branch.status}
                      </Badge>
                      <Badge variant="secondary" className={TYPE_COLORS[branch.type as BranchType]}>
                        {branch.type}
                      </Badge>
                    </div>
                    {branch.city && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {branch.city}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        )}

        <BottomSheet open={open} onOpenChange={setOpen} title="Add Branch">
          <form action="/api/enterprise/branches" method="POST" className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input name="name" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Code</label>
              <input name="code" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <select name="type" className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
                <option value="retail">Retail</option>
                <option value="warehouse">Warehouse</option>
                <option value="head_office">Head Office</option>
                <option value="office">Office</option>
                <option value="factory">Factory</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">City</label>
              <input name="city" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input name="phone" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input name="email" type="email" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <Button type="submit" variant="kazi" className="w-full">Create Branch</Button>
          </form>
        </BottomSheet>
      </div>
    </DashboardShell>
  );
}
