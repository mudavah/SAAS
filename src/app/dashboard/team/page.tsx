"use client";

import { useState, useEffect } from "react";
import { Users2, Plus, UserPlus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

type Member = {
  id: string;
  name: string;
  email: string;
  roleType: string;
  status: string;
};

export default function TeamPage() {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [orgName, setOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function fetchMembers() {
    const res = await fetch("/api/team");
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Error", description: data.error || "Failed to load team", variant: "destructive" });
      return;
    }
    if (Array.isArray(data.members)) {
      setMembers(
        data.members.map((m: any) => ({
          id: m.id,
          name: m.user?.name ?? m.name ?? null,
          email: m.user?.email ?? m.email,
          roleType: m.roleType,
          status: m.status,
        }))
      );
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  async function inviteMember() {
    if (!inviteEmail) return;
    setLoading(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, roleType: inviteRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to invite member", variant: "destructive" });
        return;
      }
      await fetchMembers();
      setInviteEmail("");
      setInviteRole("employee");
      setDialogOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function removeMember(id: string) {
    const res = await fetch(`/api/team/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      toast({ title: "Error", description: data.error || "Failed to remove member", variant: "destructive" });
      return;
    }
    await fetchMembers();
  }

  async function updateMemberRole(id: string, roleType: string) {
    const res = await fetch(`/api/team/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleType }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast({ title: "Error", description: data.error || "Failed to update role", variant: "destructive" });
      return;
    }
    await fetchMembers();
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Team</h1>
            <p className="text-muted-foreground">
              Manage {orgName || "your organization"} members and roles
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger>
              <Button variant="kazi" className="w-full sm:w-auto">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="owner">Owner</option>
                    <option value="administrator">Administrator</option>
                    <option value="manager">Manager</option>
                    <option value="accountant">Accountant</option>
                    <option value="employee">Employee</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={inviteMember} disabled={loading}>
                  {loading ? "Sending..." : "Send Invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-xl bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Member</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Role</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-kazi-green/10 text-kazi-green flex items-center justify-center text-xs font-medium">
                          {member.name?.split(" ").map((n: string) => n[0]).join("") || member.email[0]}
                        </div>
                        <span className="font-medium">{member.name || "Pending"}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{member.email}</td>
                    <td className="p-4">
                      <select
                        value={member.roleType}
                        onChange={(e) => updateMemberRole(member.id, e.target.value)}
                        className="p-1 border rounded bg-background text-sm"
                      >
                        <option value="owner">Owner</option>
                        <option value="administrator">Administrator</option>
                        <option value="manager">Manager</option>
                        <option value="accountant">Accountant</option>
                        <option value="employee">Employee</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <Badge variant={member.status === "active" ? "default" : "secondary"} className="capitalize">
                        {member.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(member.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
