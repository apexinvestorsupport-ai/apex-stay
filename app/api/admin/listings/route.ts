import { NextResponse } from "next/server";
import { ListingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { listingSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim().slice(0, 120);
  const listings = await db.listing.findMany({
    where: {
      ...(auth.user!.role === "AGENT" ? { assignedToId: auth.user!.id } : {}),
      ...(status && Object.values(ListingStatus).includes(status as ListingStatus) ? { status: status as ListingStatus } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { photos: { orderBy: { position: "asc" } }, assignedTo: { select: { id: true, name: true, email: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ listings });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const parsed = listingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const settings = await getSettings();
  if (!settings.business.purposes.includes(data.purpose)) {
    return NextResponse.json({ error: "This listing purpose is disabled in business settings." }, { status: 400 });
  }
  const assignedToId = auth.user!.role === "AGENT" ? auth.user!.id : (data.assignedToId || null);
  if (assignedToId) {
    const assignee = await db.user.findFirst({ where: { id: assignedToId, active: true } });
    if (!assignee || assignee.role === "OWNER") return NextResponse.json({ error: "Choose an active manager or agent for assignment." }, { status: 400 });
  }
  const exists = await db.listing.findUnique({ where: { slug: data.slug }, select: { id: true } });
  if (exists) return NextResponse.json({ error: "That listing URL is already in use." }, { status: 409 });
  const listing = await db.listing.create({
    data: {
      title: data.title,
      slug: data.slug,
      description: data.description,
      purpose: data.purpose,
      propertyType: data.propertyType,
      price: data.price,
      paymentPeriod: data.paymentPeriod,
      currency: settings.business.currency,
      address: data.address,
      neighbourhood: data.neighbourhood || null,
      city: data.city,
      region: data.region,
      postalCode: data.postalCode || null,
      country: data.country,
      latitude: data.latitude === "" || data.latitude == null ? null : data.latitude,
      longitude: data.longitude === "" || data.longitude == null ? null : data.longitude,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      floorArea: data.floorArea === "" || data.floorArea == null ? null : data.floorArea,
      areaUnit: data.areaUnit,
      furnished: data.furnished,
      amenities: data.amenities,
      utilities: data.utilities,
      availabilityDate: data.availabilityDate ? new Date(data.availabilityDate) : null,
      status: data.status,
      featured: data.featured,
      ownerName: data.ownerName || null,
      ownerEmail: data.ownerEmail || null,
      ownerPhone: data.ownerPhone || null,
      displayOwnerContact: data.displayOwnerContact,
      viewingInstructions: data.viewingInstructions || null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      assignedToId,
      photos: { create: data.photos },
    },
  });
  await audit(auth.user!.id, "listing.created", "listing", listing.id, { status: listing.status, slug: listing.slug });
  return NextResponse.json({ listing }, { status: 201 });
}