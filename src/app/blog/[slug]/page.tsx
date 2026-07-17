import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo/metadata";
import { BLOG_POSTS } from "@/lib/blog/posts";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return buildMetadata({ title: "Blog", path: "/blog" });
  return buildMetadata({ title: post.title, description: post.excerpt, path: `/blog/${post.slug}` });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <main>
      <Navbar />
      <article className="container mx-auto px-4 py-16 max-w-2xl">
        <Link href="/blog" className="text-kazi-green hover:underline text-sm">
          ← All posts
        </Link>
        <div className="mt-4">
          <Badge variant="outline">{post.category}</Badge>
          <h1 className="text-3xl font-bold mt-3">{post.title}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {post.author} · {post.date} · {post.readingMinutes} min read
          </p>
        </div>
        <div className="prose prose-sm dark:prose-invert mt-8 max-w-none">
          <p>{post.body}</p>
        </div>
      </article>
      <Footer />
    </main>
  );
}
