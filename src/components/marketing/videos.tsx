import { PlayCircle, Youtube } from "lucide-react";

const VIDEOS = [
  {
    title: "KaziFlow in 90 seconds",
    description: "See how to create invoices and get paid via M-Pesa.",
    embed: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    title: "Setting up eTIMS compliance",
    description: "Connect KRA eTIMS and automate tax submissions.",
    embed: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    title: "Multi-branch management",
    description: "Run approvals, transfers and benchmarking across branches.",
    embed: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
];

export function ProductVideos() {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-kazi-blue font-medium">Watch &amp; learn</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">
            Product <span className="text-kazi-green">videos</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Short walkthroughs to get your team productive in minutes.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {VIDEOS.map((v) => (
            <div key={v.title} className="rounded-xl border bg-background overflow-hidden">
              <div className="relative aspect-video bg-kazi-blue/10 flex items-center justify-center">
                <iframe
                  src={v.embed}
                  title={v.title}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-kazi-green" /> {v.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{v.description}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          <Youtube className="inline h-4 w-4 mr-1" />
          Subscribe to our YouTube channel for new tutorials every week.
        </p>
      </div>
    </section>
  );
}
