import Link from "next/link";
import { ArrowRight, Smartphone, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-kazi-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-kazi-orange/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-kazi-blue/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-kazi-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-kazi-green" />
          </span>
          Built for Kenyan businesses 🇰🇪
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance max-w-4xl mx-auto">
          Run Your Kenyan Business{" "}
          <span className="text-kazi-green">Smarter</span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
          Invoices, Clients & Payments in One Place. Accept M-Pesa, send
          professional invoices, and grow with AI — all from your phone.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup">
            <Button variant="kazi" size="xl" className="w-full sm:w-auto">
              Start Free — No Card Required
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="#features">
            <Button variant="outline" size="xl" className="w-full sm:w-auto">
              See How It Works
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <Smartphone className="h-5 w-5 text-kazi-green" />
            Mobile-first design
          </div>
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <Shield className="h-5 w-5 text-kazi-blue" />
            Secure & private
          </div>
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <Zap className="h-5 w-5 text-kazi-orange" />
            M-Pesa ready
          </div>
        </div>
      </div>
    </section>
  );
}
