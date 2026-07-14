import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { aiGenerateWorkflowSchema } from "@/lib/validations";
import { generateWorkflowFromText, generateWorkflowWithAI } from "@/lib/automation/workflow-generator";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const res = await requireApiContext(req, "automation.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const parsed = aiGenerateWorkflowSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { description, useAi } = parsed.data;
  const workflow = useAi
    ? await generateWorkflowWithAI(description)
    : generateWorkflowFromText(description);

  await logAuditSafe(ctx, {
    action: "automation.workflow.generate",
    category: "ai",
    resourceType: "automation_workflow",
    description: `AI-generated workflow draft from NL`,
    newValues: { description, triggerType: workflow.triggerType, actions: workflow.actions.length },
  });

  return NextResponse.json({ data: workflow });
}
