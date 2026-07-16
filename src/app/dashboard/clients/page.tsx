"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

export default function ClientsPage() {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function loadClients() {
    fetch("/api/clients")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load clients");
        return r.json();
      })
      .then(setClients)
      .catch(() => toast({ title: "Error", description: "Failed to load clients", variant: "destructive" }));
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function deleteClient(client: Client) {
    const confirmed = window.confirm(
      `Remove ${client.name} from your clients?\n\nTheir invoices will be kept, but won't be linked to this client anymore.`
    );
    if (!confirmed) return;

    setDeletingId(client.id);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast({
          title: "Could not delete client",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setClients((prev) => prev.filter((c) => c.id !== client.id));
      toast({
        title: "Client removed",
        description: `${client.name} has been deleted.`,
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Clients</h1>
            <p className="text-muted-foreground">
              Manage your client relationships
            </p>
          </div>
          <Link href="/dashboard/clients/new">
            <Button variant="kazi">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </Link>
        </div>

        {clients.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card">
            <p className="text-muted-foreground mb-4">No clients yet</p>
            <Link href="/dashboard/clients/new">
              <Button variant="kazi">Add Your First Client</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{client.name}</h3>
                      {client.company && (
                        <p className="text-sm text-muted-foreground">
                          {client.company}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteClient(client)}
                      disabled={deletingId === client.id}
                      aria-label={`Delete ${client.name}`}
                    >
                      {deletingId === client.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {client.email && <p>{client.email}</p>}
                    {client.phone && <p>{client.phone}</p>}
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
