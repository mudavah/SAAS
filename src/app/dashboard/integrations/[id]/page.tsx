import { notFound } from "next/navigation";
import { getPageContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import IntegrationDetailClient from "./client";
import type { Integration } from "@/components/dashboard/integrations/types";

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getPageContext({ requiredPermission: "integrations.view" });
  if (!ctx) notFound();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/integrations/${id}`,
    { cache: "no-store" }
  );
  const payload = await res.json().catch(() => ({}));
  const integration: Integration | undefined = payload?.data;

  if (!integration) {
    return (
      <DashboardShell>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Integration not found.
          </CardContent>
        </Card>
      </DashboardShell>
    );
  }

  return <IntegrationDetailClient integration={integration} />;
}
