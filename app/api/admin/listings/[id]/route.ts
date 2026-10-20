import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { listingSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const listing = await db.listing.findUnique({
    where: { id },
    include: { photos: { orderBy: { position: "asc" } } },
  });
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (auth.user!.role === "AGENT" && listing.assignedToId !== auth.user!.id) {
    return NextResponse.json({ error: "This listing is not assigned to you." }, { status: 403 });
  }
  return NextResponse.json({ listing });
}

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const existing = await db.listing.findUnique({ where: { id }, select: { id: true, assignedToId: true } });
  if (!existing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (auth.user!.role === "AGENT" && existing.assignedToId !== auth.user!.id) {
    return NextResponse.json({ error: "This listing is not assigned to you." }, { status: 403 });
  }
  const parsed = listingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const settings = await getSettings();
  if (!settings.business.purposes.includes(data.purpose)) {
    return NextResponse.json({ error: "This listing purpose is disabled in business settings." }, { status: 400 });
  }
  const duplicate = await db.listing.findFirst({ where: { slug: data.slug, id: { not: id } }, select: { id: true } });
  if (duplicate) return NextResponse.json({ error: "That listing URL is already in use." }, { status: 409 });
  const assignedToId = auth.user!.role === "AGENT" ? existing.assignedToId : (data.assignedToId || null);
  if (assignedToId && auth.user!.role !== "AGENT") {
    const assignee = await db.user.findFirst({ where: { id: assignedToId, active: true } });
    if (!assignee || assignee.role === "OWNER") return NextResponse.json({ error: "Choose an active manager or agent for assignment." }, { status: 400 });
  }
  const listing = await db.listing.update({
    where: { id },
    data: {
      title: data.title, slug: data.slug, description: data.description, purpose: data.purpose,
      propertyType: data.propertyType, price: data.price, paymentPeriod: data.paymentPeriod,
      currency: settings.business.currency, address: data.address, neighbourhood: data.neighbourhood || null,
      city: data.city, region: data.region, postalCode: data.postalCode || null, country: data.country,
      latitude: data.latitude === "" || data.latitude == null ? null : data.latitude,
      longitude: data.longitude === "" || data.longitude == null ? null : data.longitude,
      bedrooms: data.bedrooms, bathrooms: data.bathrooms,
      floorArea: data.floorArea === "" || data.floorArea == null ? null : data.floorArea,
      areaUnit: data.areaUnit, furnished: data.furnished, amenities: data.amenities, utilities: data.utilities,
      availabilityDate: data.availabilityDate ? new Date(data.availabilityDate) : null,
      status: data.status, featured: data.featured, ownerName: data.ownerName || null,
      ownerEmail: data.ownerEmail || null, ownerPhone: data.ownerPhone || null,
      displayOwnerContact: data.displayOwnerContact, viewingInstructions: data.viewingInstructions || null,
      seoTitle: data.seoTitle || null, seoDescription: data.seoDescription || null, assignedToId,
      photos: { deleteMany: {}, create: data.photos },
    },
    include: { photos: { orderBy: { position: "asc" } } },
  });
  await audit(auth.user!.id, "listing.updated", "listing", id, { status: listing.status, slug: listing.slug });
  return NextResponse.json({ listing });
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireApiUser(["OWNER", "MANAGER"]);
  if (auth.response) return auth.response;
  const { id } = await params;
  const listing = await db.listing.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  await db.listing.delete({ where: { id } });
  await audit(auth.user!.id, "listing.deleted", "listing", id, { title: listing.title });
  return NextResponse.json({ ok: true });
}
