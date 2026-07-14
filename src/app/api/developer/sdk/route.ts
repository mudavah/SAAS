import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiContext } from "@/lib/session";
import { getCorsHeaders } from "@/lib/api/cors";
import { generateSdkCode, getSdkLanguages } from "@/lib/api/sdk";

const generateSchema = z.object({
  language: z.string().min(1, "Language is required"),
  apiKey: z.string().min(1, "API key is required"),
});

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "api.sdk.generate");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    const code = generateSdkCode({
      language: parsed.data.language,
      apiKey: parsed.data.apiKey,
    });

    return NextResponse.json(
      { code, language: parsed.data.language },
      { headers: getCorsHeaders(req) }
    );
  } catch (error) {
    console.error("Generate SDK error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getCorsHeaders(req) }
    );
  }
}

export async function GET(req: Request) {
  const res = await requireApiContext(req, "api.sdk.generate");
  if ("error" in res) return res.error;
  const languages = getSdkLanguages();
  return NextResponse.json({ languages }, { headers: getCorsHeaders(req) });
}
