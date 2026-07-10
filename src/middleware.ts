import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/", "/login", "/signup", "/forgot-password", "/privacy", "/terms"];
const authRoutes = ["/login", "/signup", "/forgot-password"];

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const isLoggedIn = !!req.auth;
  const isPublic = publicRoutes.includes(pathname);
  const isAuthRoute = authRoutes.includes(pathname);
  const isOnboarding = pathname === "/onboarding";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isMpesaCallback = pathname === "/api/mpesa/callback" || pathname.startsWith("/api/payments/webhooks/mpesa");
  const isStripeWebhook = pathname === "/api/stripe/webhook" || pathname.startsWith("/api/payments/webhooks/stripe");
  const isPesapalWebhook = pathname.startsWith("/api/payments/webhooks/pesapal");
  const isPaymentWebhooks = pathname.startsWith("/api/payments/webhooks");
  // Public API routes authenticate via API keys inside the handler.
  const isPublicApi = pathname.startsWith("/api/v1");
  const isApi = pathname.startsWith("/api");

  // These endpoints authenticate themselves — never redirect them.
  if (isApiAuth || isMpesaCallback || isStripeWebhook || isPesapalWebhook || isPaymentWebhooks || isPublicApi) {
    return NextResponse.next();
  }

  // Other API routes authenticate via session cookies; let them return 401.
  if (isApi) {
    return NextResponse.next();
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (
    isLoggedIn &&
    !req.auth?.user?.onboardingComplete &&
    !isOnboarding &&
    !isApi
  ) {
    return NextResponse.redirect(new URL("/onboarding", nextUrl));
  }

  // Tenant guard: a logged-in, onboarded user must have an active organization.
  if (
    isLoggedIn &&
    req.auth?.user?.onboardingComplete &&
    !req.auth?.user?.orgId &&
    pathname.startsWith("/dashboard") &&
    !isApi
  ) {
    return NextResponse.redirect(new URL("/onboarding", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
