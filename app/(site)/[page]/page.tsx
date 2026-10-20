import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { defaultPages } from "@/lib/defaults";
import { db } from "@/lib/db";
import { EnquiryForm } from "@/app/components/interactive";

const allowed = new Set(defaultPages.map((page) => page.slug));
type Context = { params: Promise<{ page: string }> };

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const { page } = await params;
  if (!allowed.has(page)) return { title: "Not found" };
  const content = process.env.DATABASE_URL ? await db.sitePage.findUnique({ where: { slug: page } }) : null;
  if (content && !content.published) return { title: "Page unavailable", robots: { index: false, follow: false } };
  const fallback = defaultPages.find((item) => item.slug === page)!;
  return {
    title: content?.metaTitle || content?.title || fallback.title,
    description: content?.metaDescription || content?.body.slice(0, 155) || "",
  };
}

export default async function ContentPage({ params }: Context) {
  const { page } = await params;
  if (!allowed.has(page)) notFound();
  const content = process.env.DATABASE_URL ? await db.sitePage.findUnique({ where: { slug: page } }) : null;
  if (content && !content.published) notFound();
  const fallback = defaultPages.find((item) => item.slug === page)!;
  const title = content?.title || fallback.title;
  const body = content?.body || fallback.body;
  return <section className="content-page shell"><span className="eyebrow">{page === "contact" ? "We’re here to help" : "Apex Stay"}</span><h1>{title}</h1><div className="content-prose">{body.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>{page === "contact" && <div className="contact-page-actions"><div className="content-cta">Want to ask about a particular home? <Link className="text-link" href="/search">Browse apartments <span aria-hidden="true">→</span></Link></div><div className="contact-form-wrap"><EnquiryForm /></div></div>}</section>;
}
