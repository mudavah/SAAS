import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { signupApiSchema } from "@/lib/validations";
import { rateLimit, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS, clientIp } from "@/lib/api/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    // Throttle account-enumeration / abuse on this unauthenticated endpoint.
    const rl = await rateLimit({
      key: `auth:signup:${clientIp(req)}`,
      limit: AUTH_RATE_LIMIT,
      windowMs: AUTH_RATE_WINDOW_MS,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": "600" } }
      );
    }

    const body = await req.json();
    const parsed = signupApiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    await db.insert(users).values({
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Signup error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
