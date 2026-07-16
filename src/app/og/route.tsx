import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo/config";

export const runtime = "edge";

/**
 * Dynamically generated Open Graph / Twitter Card image. Avoids shipping a
 * large static binary while staying cacheable at the edge for Core Web Vitals.
 * Falls back to /og/default.png (referenced in metadata) if edge generation
 * is unavailable. Supports a `?title=` query to customize per-page.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "Run Your Kenyan Business Smarter";
  const subtitle = searchParams.get("subtitle") || "Invoices · Clients · M-Pesa · AI";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #006B3F 0%, #0B3D2E 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 40, fontWeight: 700 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "white",
              color: "#006B3F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 20,
              fontWeight: 900,
            }}
          >
            K
          </div>
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
          <div style={{ fontSize: 36, opacity: 0.85, marginTop: 16 }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: 28, opacity: 0.7 }}>kaziflow.co.ke</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
