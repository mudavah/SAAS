import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "Wanjiku M.",
    role: "Freelance Designer, Nairobi",
    initials: "WM",
    quote:
      "KaziFlow changed how I handle invoicing. My clients pay via M-Pesa instantly and I get notified right away. Game changer!",
  },
  {
    name: "James O.",
    role: "Consultant, Mombasa",
    initials: "JO",
    quote:
      "As a solopreneur, I needed something simple and affordable. KaziFlow is exactly that — professional invoices in under a minute.",
  },
  {
    name: "Amina K.",
    role: "Catering Business, Kisumu",
    initials: "AK",
    quote:
      "The expense tracking and tax reports save me hours every month. And the AI helps me write better client emails. Love it!",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Trusted by Kenyan{" "}
            <span className="text-kazi-blue">Entrepreneurs</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join hundreds of freelancers and small businesses already using
            KaziFlow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testimonials.map((t) => (
            <Card key={t.name} className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-muted-foreground italic mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-kazi-green/10 text-kazi-green">
                      {t.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
