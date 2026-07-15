import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { forgotPasswordSchema } from "@/lib/validations";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS, clientIp } from "@/lib/api/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    // Throttle email-bombing on this unauthenticated endpoint.
    const rl = await rateLimit({
      key: `auth:forgot:${clientIp(req)}`,
      limit: AUTH_RATE_LIMIT,
      windowMs: AUTH_RATE_WINDOW_MS,
    });
    if (!rl.allowed) {
      return NextResponse.json({ success: true });
    }

    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    });

    // Always return success to prevent email enumeration
    if (user) {
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login?reset=pending`;
      await sendPasswordResetEmail(parsed.data.email, resetUrl);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Forgot password error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ success: true });
  }
}
