"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";

interface HelpArticle {
  title: string;
  body: string;
}

interface HelpCategory {
  name: string;
  articles: HelpArticle[];
}

const CATEGORIES: HelpCategory[] = [
  {
    name: "Getting Started",
    articles: [
      {
        title: "Create your organization",
        body: "After signing up, complete onboarding to create your personal organization (your tenant). Every record you create is scoped to it.",
      },
      {
        title: "Invite your team",
        body: "Go to Team to invite coworkers and assign roles: Owner, Administrator, Manager, Accountant, Employee, or Viewer. Permissions are enforced per action.",
      },
      {
        title: "Choose a plan",
        body: "Free includes 5 invoices/month and 10 clients. Upgrade to Pro or Business for unlimited records, M-Pesa, tax reports, API access, and more.",
      },
    ],
  },
  {
    name: "Invoicing & Payments",
    articles: [
      {
        title: "Create an invoice",
        body: "Dashboard → Invoices → New. Add line items, set currency (KES default), and send by email or share a link. PDF export is included on every plan.",
      },
      {
        title: "Accept M-Pesa",
        body: "On Pro/Business, use Payments → Send STK Push. Customers pay via M-Pesa; webhooks update the invoice status automatically.",
      },
      {
        title: "Subscriptions (Stripe)",
        body: "Manage your plan under Payments → Subscriptions. Webhook signature verification keeps billing secure.",
      },
    ],
  },
  {
    name: "Security & Privacy",
    articles: [
      {
        title: "How is my data isolated?",
        body: "KaziFlow is multi-tenant: every business record carries an organizationId and all queries are scoped to your active organization. Cross-tenant access is blocked at the API layer.",
      },
      {
        title: "Roles & permissions",
        body: "RBAC gates every endpoint. A Viewer can read but never delete; only roles with the right permission can approve payroll or manage billing.",
      },
      {
        title: "Data protection",
        body: "We encrypt credentials at rest, enforce HSTS/CSP, and process payments via PCI-compliant Stripe and M-Pesa. See our Privacy Policy.",
      },
    ],
  },
  {
    name: "Developer & Integrations",
    articles: [
      {
        title: "Public API",
        body: "Business plans get API access. Create an API key under Settings → API Keys, then call /api/v1/* with Bearer auth. Scopes map to RBAC permissions.",
      },
      {
        title: "Integration Hub",
        body: "Connect Google, Microsoft, QuickBooks, Xero, WhatsApp, SMS, and more. Credentials are encrypted per-connection and never shared across tenants.",
      },
      {
        title: "Webhooks",
        body: "Register webhook endpoints to receive real-time events. We sign payloads so you can verify authenticity.",
      },
    ],
  },
];

export default function HelpCenterPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/customersuccess/knowledge-base")
      .then((r) => r.json())
      .then((d) => setArticles(d.articles ?? []))
      .catch(() => undefined);
  }, []);

  const filtered = articles.filter(
    (a) =>
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.body || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main>
      <Navbar />
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Help Center</h1>
        <p className="text-muted-foreground mb-6">
          Answers for getting the most out of KaziFlow. For billing or account
          issues, email{" "}
          <a href="mailto:hello@kaziflow.co.ke" className="text-kazi-green underline">
            hello@kaziflow.co.ke
          </a>
          .
        </p>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the knowledge base…"
          className="w-full border rounded-lg px-4 py-2 mb-8 bg-background"
        />

        {filtered.length > 0 && (
          <section className="rounded-xl border p-5 mb-8">
            <h2 className="text-lg font-semibold mb-3">Knowledge Base</h2>
            <div className="space-y-4">
              {filtered.map((a) => (
                <article key={a.id}>
                  <h3 className="font-medium text-foreground">{a.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {(a.excerpt || a.body || "").slice(0, 160)}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          {CATEGORIES.map((cat) => (
            <section
              key={cat.name}
              className="rounded-xl border p-5"
            >
              <h2 className="text-lg font-semibold mb-3">{cat.name}</h2>
              <div className="space-y-4">
                {cat.articles.map((a) => (
                  <article key={a.title}>
                    <h3 className="font-medium text-foreground">{a.title}</h3>
                    <p className="text-sm text-muted-foreground">{a.body}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex gap-4 text-sm">
          <Link href="/privacy" className="text-kazi-green hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-kazi-green hover:underline">
            Terms of Service
          </Link>
          <Link href="/cookie-policy" className="text-kazi-green hover:underline">
            Cookie Policy
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
