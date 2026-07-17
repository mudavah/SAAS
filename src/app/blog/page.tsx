import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo/metadata";
import { BLOG_POSTS } from "@/lib/blog/posts";

export const metadata: Metadata = buildMetadata({
  title: "Blog",
  description: "Product updates, compliance guides and business tips for KaziFlow customers.",
  path: "/blog",
});

export default function BlogPage() {
  return (
    <main>
      <Navbar />
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">KaziFlow Blog</h1>
        <p className="text-muted-foreground mb-10">Product news, compliance guides and growth tips.</p>
        <div className="grid gap-6 md:grid-cols-2">
          {BLOG_POSTS.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block">
              <article className="rounded-xl border p-5 h-full hover:border-kazi-green transition">
                <Badge variant="outline">{post.category}</Badge>
                <h2 className="text-xl font-semibold mt-3">{post.title}</h2>
                <p className="text-sm text-muted-foreground mt-2">{post.excerpt}</p>
                <div className="text-xs text-muted-foreground mt-4">
                  {post.author} · {post.date} · {post.readingMinutes} min read
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
