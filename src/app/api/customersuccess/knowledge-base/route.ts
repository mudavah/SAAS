import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { listArticles, getArticle, createArticle } from "@/lib/customersuccess";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const search = url.searchParams.get("search") || undefined;
  if (slug) {
    const article = await getArticle(slug);
    if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ article });
  }
  const res = await requireApiContext(req).catch(() => null);
  const ctx = res && !("error" in res) ? res.ctx : null;
  const articles = await listArticles({ search, orgId: ctx?.organizationId });
  return NextResponse.json({ articles });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "organization.manage_settings");
  if ("error" in res) return res.error;
  const body = await req.json().catch(() => ({}));
  if (!body.title || !body.slug || !body.body) {
    return NextResponse.json({ error: "title, slug and body are required." }, { status: 400 });
  }
  const article = await createArticle(res.ctx, {
    title: body.title,
    slug: body.slug,
    category: body.category,
    body: body.body,
    excerpt: body.excerpt,
    isGlobal: body.isGlobal ?? true,
  });
  return NextResponse.json({ article }, { status: 201 });
}
