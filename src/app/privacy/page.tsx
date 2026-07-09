import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";

export default function PrivacyPage() {
  return (
    <main>
      <Navbar />
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose prose-sm dark:prose-invert space-y-4 text-muted-foreground">
          <p><strong>Last updated:</strong> {new Date().toLocaleDateString("en-KE")}</p>
          <p>KaziFlow (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Account information (name, email, business details)</li>
            <li>Business data (invoices, clients, payments, expenses)</li>
            <li>Payment information processed via Stripe and M-Pesa</li>
            <li>Usage data and analytics</li>
          </ul>
          <h2 className="text-xl font-semibold text-foreground mt-8">How We Use Your Data</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Provide and improve our services</li>
            <li>Process payments and send invoices</li>
            <li>Send service-related communications</li>
            <li>Comply with legal obligations</li>
          </ul>
          <h2 className="text-xl font-semibold text-foreground mt-8">Data Security</h2>
          <p>We use industry-standard encryption and security practices. Your data is stored securely in PostgreSQL databases with access controls.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">Your Rights</h2>
          <p>Under Kenya&apos;s Data Protection Act, you have the right to access, correct, or delete your personal data. Contact us at hello@kaziflow.co.ke.</p>
          <h2 className="text-xl font-semibold text-foreground mt-8">Contact</h2>
          <p>Email: hello@kaziflow.co.ke</p>
        </div>
        <Link href="/" className="inline-block mt-8 text-kazi-green hover:underline">← Back to home</Link>
      </div>
      <Footer />
    </main>
  );
}
