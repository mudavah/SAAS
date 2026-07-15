import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";

export default function CookiePolicyPage() {
  return (
    <main>
      <Navbar />
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">Cookie Policy</h1>
        <div className="prose prose-sm dark:prose-invert space-y-4 text-muted-foreground">
          <p>
            <strong>Last updated:</strong> {new Date().toLocaleDateString("en-KE")}
          </p>
          <p>
            This Cookie Policy explains how KaziFlow (&quot;we&quot;, &quot;our&quot;,
            &quot;us&quot;) uses cookies and similar technologies when you use our
            website and application.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">
            What Are Cookies
          </h2>
          <p>
            Cookies are small text files stored on your device that help us
            recognize your browser, remember your preferences, and understand how
            you use KaziFlow so we can improve it.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">
            How We Use Cookies
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Essential:</strong> authentication/session cookies
              (incl. <code>kf_active_org</code>) required for the app to function.
            </li>
            <li>
              <strong>Security:</strong> CSRF/anti-fraud tokens and rate-limit
              identifiers.
            </li>
            <li>
              <strong>Preferences:</strong> theme (light/dark) and locale.
            </li>
            <li>
              <strong>Analytics:</strong> anonymized usage metrics to improve
              performance and reliability (no resale).
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8">
            Your Choices
          </h2>
          <p>
            You can control or delete cookies through your browser settings.
            Disabling essential cookies may prevent parts of KaziFlow from working.
            We do not use cookies for cross-site advertising tracking.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">Changes</h2>
          <p>
            We may update this policy from time to time. Material changes will be
            communicated via the app or email.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">Contact</h2>
          <p>Email: hello@kaziflow.co.ke</p>
        </div>
        <div className="mt-8 flex gap-4 text-sm">
          <Link href="/privacy" className="text-kazi-green hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-kazi-green hover:underline">
            Terms of Service
          </Link>
          <Link href="/help" className="text-kazi-green hover:underline">
            Help Center
          </Link>
        </div>
        <Link
          href="/"
          className="inline-block mt-8 text-kazi-green hover:underline"
        >
          ← Back to home
        </Link>
      </div>
      <Footer />
    </main>
  );
}
