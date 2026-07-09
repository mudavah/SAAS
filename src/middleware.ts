import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/", "/login", "/signup", "/forgot-password", "/privacy", "/terms"];
const authRoutes = ["/login", "/signup", "/forgot-password"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isPublic = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);
  const isOnboarding = nextUrl.pathname === "/onboarding";
  const isApiAuth = nextUrl.pathname.startsWith("/api/auth");
  const isMpesaCallback = nextUrl.pathname === "/api/mpesa/callback";
  const isStripeWebhook = nextUrl.pathname === "/api/stripe/webhook";

  if (isApiAuth || isMpesaCallback || isStripeWebhook) return;

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
    !nextUrl.pathname.startsWith("/api")
  ) {
    return NextResponse.redirect(new URL("/onboarding", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
