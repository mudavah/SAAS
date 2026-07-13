import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";

export interface SyncStatusResponse {
  lastSyncAt: number | null;
  isOnline: boolean;
  pendingCount: number;
  conflicts: Array<{
    id: string;
    entity: string;
    entityId: string;
    detectedAt: number;
  }>;
}

export async function GET(req: Request) {
  const res = await requireApiContext(req, "sync.status");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/sync/status/internal`, {
      headers: {
        "x-kf-org": ctx.organizationId,
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        lastSyncAt: null,
        isOnline: true,
        pendingCount: 0,
        conflicts: [],
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      lastSyncAt: null,
      isOnline: true,
      pendingCount: 0,
      conflicts: [],
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
