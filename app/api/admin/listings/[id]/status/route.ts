import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ status: z.enum(["DRAFT", "AVAILABLE", "COMING_SOON", "RENTED_SOLD", "ARCHIVED"]) });

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const listing = await db.listing.findUnique({ where: { id }, select: { id: true, assignedToId: true, status: true } });
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (auth.user!.role === "AGENT" && listing.assignedToId !== auth.user!.id) {
    return NextResponse.json({ error: "This listing is not assigned to you." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid listing status." }, { status: 400 });
  const updated = await db.listing.update({ where: { id }, data: { status: parsed.data.status } });
  await audit(auth.user!.id, `listing.status.${parsed.data.status.toLowerCase()}`, "listing", id);
  return NextResponse.json({ status: updated.status });
}
