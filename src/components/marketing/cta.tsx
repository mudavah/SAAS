import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-kazi-green to-kazi-blue px-8 py-16 md:px-16 md:py-20 text-center text-white">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-kazi-orange rounded-full blur-3xl" />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Streamline Your Business?
            </h2>
            <p className="mt-4 text-lg opacity-90 max-w-xl mx-auto">
              Join KaziFlow today and start sending professional invoices in
              minutes. Free forever plan available.
            </p>
            <Link href="/signup" className="inline-block mt-8">
              <Button
                size="xl"
                className="bg-white text-kazi-green hover:bg-white/90"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
