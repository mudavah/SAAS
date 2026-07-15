import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const HEADER = "x-request-id";

function correlationId(req: NextRequest): string {
  const existing = req.headers.get(HEADER);
  if (existing) return existing;
  return crypto.randomUUID();
}

const publicRoutes = ["/", "/login", "/signup", "/forgot-password", "/privacy", "/terms"];
const authRoutes = ["/login", "/signup", "/forgot-password"];

export default auth((req) => {
  const id = correlationId(req);
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const isLoggedIn = !!req.auth;
  const isPublic = publicRoutes.includes(pathname);
  const isAuthRoute = authRoutes.includes(pathname);
  const isOnboarding = pathname === "/onboarding";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isMpesaCallback = pathname === "/api/mpesa/callback" || pathname.startsWith("/api/payments/webhooks/mpesa");
  const isPaymentWebhooks = pathname.startsWith("/api/payments/webhooks");
  const isPublicApi = pathname.startsWith("/api/v1");
  const isDeveloperApi = pathname.startsWith("/api/developer");
  const isDeveloperPortal = pathname.startsWith("/developer");
  const isApi = pathname.startsWith("/api");

  if (isApiAuth || isMpesaCallback || isPaymentWebhooks || isPublicApi || isDeveloperApi) {
    const res = NextResponse.next();
    res.headers.set(HEADER, id);
    return res;
  }

  if (isApi) {
    const res = NextResponse.next();
    res.headers.set(HEADER, id);
    return res;
  }

  if (isAuthRoute && isLoggedIn) {
    const res = NextResponse.redirect(new URL("/dashboard", nextUrl));
    res.headers.set(HEADER, id);
    return res;
  }

  if (!isLoggedIn && !isPublic) {
    const res = NextResponse.redirect(new URL("/login", nextUrl));
    res.headers.set(HEADER, id);
    return res;
  }

  if (
    isLoggedIn &&
    !req.auth?.user?.onboardingComplete &&
    !isOnboarding &&
    !isApi
  ) {
    const res = NextResponse.redirect(new URL("/onboarding", nextUrl));
    res.headers.set(HEADER, id);
    return res;
  }

  if (
    isLoggedIn &&
    req.auth?.user?.onboardingComplete &&
    !req.auth?.user?.orgId &&
    pathname.startsWith("/dashboard") &&
    !isApi
  ) {
    const res = NextResponse.redirect(new URL("/onboarding", nextUrl));
    res.headers.set(HEADER, id);
    return res;
  }

  const res = NextResponse.next();
  res.headers.set(HEADER, id);
  return res;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
