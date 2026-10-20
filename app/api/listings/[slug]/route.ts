import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Context) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Listing details are unavailable until the database is configured." }, { status: 503 });
  }
  const { slug } = await params;
  const settings = await getSettings();
  const listing = await db.listing.findFirst({
    where: {
      slug,
      status: { in: ["AVAILABLE", "COMING_SOON"] },
      purpose: { in: settings.business.purposes as ("RENT" | "SALE")[] },
    },
    include: { photos: { orderBy: { position: "asc" } } },
  });
  if (!listing || !["AVAILABLE", "COMING_SOON"].includes(listing.status)) {
    return NextResponse.json({ error: "Apartment not found." }, { status: 404 });
  }
  return NextResponse.json({
    listing: {
      id: listing.id,
      title: listing.title,
      slug: listing.slug,
      description: listing.description,
      purpose: listing.purpose,
      propertyType: listing.propertyType,
      price: Number(listing.price),
      currency: listing.currency,
      paymentPeriod: listing.paymentPeriod,
      address: listing.address,
      neighbourhood: listing.neighbourhood,
      city: listing.city,
      region: listing.region,
      postalCode: listing.postalCode,
      country: listing.country,
      bathrooms: Number(listing.bathrooms),
      bedrooms: listing.bedrooms,
      floorArea: listing.floorArea ? Number(listing.floorArea) : null,
      areaUnit: listing.areaUnit,
      latitude: listing.latitude ? Number(listing.latitude) : null,
      longitude: listing.longitude ? Number(listing.longitude) : null,
      amenities: listing.amenities,
      utilities: listing.utilities,
      availabilityDate: listing.availabilityDate,
      status: listing.status,
      photos: listing.photos.map((photo) => ({ id: photo.id, url: photo.url, caption: photo.caption, altText: photo.altText, position: photo.position, cover: photo.cover })),
      ownerName: listing.displayOwnerContact && settings.business.showOwnerContact ? listing.ownerName : null,
      ownerEmail: listing.displayOwnerContact && settings.business.showOwnerContact ? listing.ownerEmail : null,
      ownerPhone: listing.displayOwnerContact && settings.business.showOwnerContact ? listing.ownerPhone : null,
    },
  });
}
