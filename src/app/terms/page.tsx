import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";

export default function TermsPage() {
  return (
    <main>
      <Navbar />
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <div className="prose prose-sm dark:prose-invert space-y-4 text-muted-foreground">
          <p><strong>Last updated:</strong> {new Date().toLocaleDateString("en-KE")}</p>
          <p>By using KaziFlow, you agree to these terms. Please read them carefully.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">Service Description</h2>
          <p>KaziFlow provides business management tools including invoicing, client management, payment processing, and expense tracking for freelancers and small businesses.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">Account Responsibilities</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>You must provide accurate information</li>
            <li>You are responsible for maintaining account security</li>
            <li>You must comply with applicable laws including KRA tax requirements</li>
          </ul>
          <h2 className="text-xl font-semibold text-foreground mt-8">Subscription & Billing</h2>
          <p>Free tier includes usage limits. Paid plans are billed monthly via Stripe. You may cancel at any time. Refunds are handled per our refund policy.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">Limitation of Liability</h2>
          <p>KaziFlow is provided &quot;as is&quot;. We are not liable for business losses, tax penalties, or payment disputes between you and your clients.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">Contact</h2>
          <p>Email: hello@kaziflow.co.ke</p>
        </div>
        <Link href="/" className="inline-block mt-8 text-kazi-green hover:underline">← Back to home</Link>
      </div>
      <Footer />
    </main>
  );
}
