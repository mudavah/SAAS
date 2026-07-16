import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { listTimelineEvents } from "@/lib/timeline";
import { formatDate } from "@/lib/utils";

/**
 * GET /api/timeline/export?format=csv
 * Exports the organization's business timeline as CSV. Honors the same filter
 * and search parameters as the list endpoint. Streams a downloadable file.
 */
export async function GET(req: Request) {
  const res = await requireApiContext(req, "timeline.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") || "csv").toLowerCase();
  const eventType = searchParams.get("eventType");
  const resourceType = searchParams.get("resourceType");
  const search = searchParams.get("search");

  const { data } = await listTimelineEvents(ctx.organizationId, {
    page: 1,
    limit: 1000,
    eventType,
    resourceType,
    search,
    startDate: searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : null,
    endDate: searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : null,
  });

  if (format === "json") {
    return NextResponse.json({ data });
  }

  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };

  const header = ["timestamp", "event_type", "title", "description", "actor", "resource_type"];
  const rows = data.map((e) =>
    [
      e.createdAt ? new Date(e.createdAt).toISOString() : "",
      e.eventType,
      e.title,
      e.description ?? "",
      e.user?.name ?? e.user?.email ?? "system",
      e.resourceType ?? "",
    ]
      .map(escape)
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");
  const filename = `kaziflow-timeline-${ctx.organizationId.slice(0, 8)}-${Date.now()}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
