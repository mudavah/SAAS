import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo/metadata";
import { PlayCircle, BarChart3, Receipt, Users, ShieldCheck, Sparkles } from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "Live Demo",
  description:
    "Explore KaziFlow with a guided product tour — invoicing, M-Pesa, eTIMS compliance, multi-branch management and more.",
  path: "/demo",
});

const STEPS = [
  { icon: Receipt, title: "Create an invoice", text: "Build a branded invoice with line items and send it by email or link." },
  { icon: Users, title: "Manage clients", text: "Keep contacts, notes and communication logs in one place." },
  { icon: BarChart3, title: "Track performance", text: "Dashboards for revenue, profit, tax health and branch benchmarking." },
  { icon: ShieldCheck, title: "Stay compliant", text: "Automate KRA eTIMS submissions and monitor your compliance health." },
  { icon: Sparkles, title: "Use AI assistant", text: "Draft invoice descriptions, emails and social posts instantly." },
];

export default function DemoPage() {
  return (
    <main>
      <Navbar />
      <section className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 text-kazi-green font-medium">
            <PlayCircle className="h-5 w-5" /> Guided Demo
          </span>
          <h1 className="text-4xl font-bold mt-2">See KaziFlow in action</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Take the product tour, then start a free workspace — no credit card required.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/signup">
              <Button variant="kazi" size="lg">Start free trial</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">View pricing</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((s) => (
            <Card key={s.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <s.icon className="h-5 w-5 text-kazi-blue" /> {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Prefer to read? Visit our{" "}
            <Link href="/help" className="text-kazi-green underline">Help Center</Link> or{" "}
            <Link href="/blog" className="text-kazi-green underline">Blog</Link>.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
