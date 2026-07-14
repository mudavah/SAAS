import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { TRIGGER_EVENTS, ACTION_CATALOG } from "@/lib/automation/catalog";
import { generateWorkflowFromText, WORKFLOW_TEMPLATES } from "@/lib/automation/workflow-generator";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "automation.view");
  if ("error" in res) return res.error;
  return NextResponse.json({
    data: {
      triggers: TRIGGER_EVENTS,
      actions: ACTION_CATALOG,
      templates: WORKFLOW_TEMPLATES.map((t) => ({ name: t.name, description: t.description, workflow: t.build() })),
    },
  });
}
