import type { Metadata } from "next";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Pricing } from "@/components/marketing/pricing";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Pricing",
  description:
    "Simple, transparent pricing for KaziFlow. Start free, upgrade to Pro or Business for unlimited invoicing, M-Pesa, eTIMS compliance, and more.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <main>
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold">Pricing that scales with you</h1>
          <p className="text-muted-foreground mt-2">
            Every plan includes invoicing, clients, and PDF export. No hidden fees.
          </p>
        </div>
        <Pricing />
      </div>
      <Footer />
    </main>
  );
}
