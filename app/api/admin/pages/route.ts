import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

const pageSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().max(12000),
  metaTitle: z.string().trim().max(160).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  published: z.boolean(),
});

export async function GET() {
  const auth = await requireApiUser(["OWNER"]);
  if (auth.response) return auth.response;
  return NextResponse.json({ pages: await db.sitePage.findMany({ orderBy: { slug: "asc" } }) });
}

export async function PUT(request: Request) {
  const auth = await requireApiUser(["OWNER"]);
  if (auth.response) return auth.response;
  const parsed = pageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const page = await db.sitePage.upsert({
    where: { slug: parsed.data.slug },
    create: parsed.data,
    update: parsed.data,
  });
  await audit(auth.user!.id, "page.updated", "page", page.slug);
  return NextResponse.json({ page });
}
