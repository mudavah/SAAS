import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { logger } from "@/lib/logger";

export interface ConflictResolutionRequest {
  conflictId: string;
  action: {
    strategy: "keep-local" | "keep-remote" | "keep-both" | "manual";
    reason?: string;
    localRecord?: Record<string, unknown>;
    remoteRecord?: Record<string, unknown>;
  };
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "sync.conflict");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const { conflictId, action }: ConflictResolutionRequest = body;

    if (!conflictId || !action || !action.strategy) {
      return NextResponse.json(
        { error: "Missing required fields: conflictId, action.strategy" },
        { status: 400 }
      );
    }

    const validStrategies = ["keep-local", "keep-remote", "keep-both", "manual"];
    if (!validStrategies.includes(action.strategy)) {
      return NextResponse.json(
        { error: `Invalid strategy: ${action.strategy}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      conflictId,
      resolution: action,
      resolvedAt: Date.now(),
      resolvedBy: ctx.userId,
    });
  } catch (error) {
    logger.error("Conflict resolution error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
