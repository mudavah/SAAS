import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { Pricing } from "@/components/marketing/pricing";
import { Testimonials } from "@/components/marketing/testimonials";
import { ProductVideos } from "@/components/marketing/videos";
import { CTA } from "@/components/marketing/cta";
import { Footer } from "@/components/marketing/footer";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationJsonLd, softwareApplicationJsonLd } from "@/lib/seo/metadata";

export default function HomePage() {
  return (
    <main>
      <JsonLd data={[organizationJsonLd(), softwareApplicationJsonLd()]} />
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <ProductVideos />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  );
}
