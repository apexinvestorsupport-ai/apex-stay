import { ListingPurpose, ListingStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Listing search is unavailable until the database is configured." }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const settings = await getSettings();
  const requestedPurpose = searchParams.get("purpose")?.toUpperCase();
  const purpose = requestedPurpose && settings.business.purposes.includes(requestedPurpose)
    ? requestedPurpose as ListingPurpose
    : undefined;
  const search = searchParams.get("q")?.trim().slice(0, 120);
  const minPrice = Number(searchParams.get("minPrice"));
  const maxPrice = Number(searchParams.get("maxPrice"));
  const bedrooms = Number(searchParams.get("bedrooms"));
  const bathrooms = Number(searchParams.get("bathrooms"));
  const amenities = searchParams.getAll("amenity").slice(0, 20);
  const page = Math.max(1, Math.min(500, Number(searchParams.get("page")) || 1));
  const pageSize = 12;
  const sort = searchParams.get("sort");
  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    sort === "price_asc" ? [{ price: "asc" }, { createdAt: "desc" }]
      : sort === "price_desc" ? [{ price: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];
  const price: Prisma.DecimalFilter = {};
  if (Number.isFinite(minPrice) && minPrice >= 0) price.gte = minPrice;
  if (Number.isFinite(maxPrice) && maxPrice > 0) price.lte = maxPrice;
  const conditions: Prisma.ListingWhereInput[] = [];
  if (search) conditions.push({
    OR: [
      { city: { contains: search, mode: "insensitive" } },
      { neighbourhood: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { region: { contains: search, mode: "insensitive" } },
      { postalCode: { contains: search, mode: "insensitive" } },
    ],
  });
  const availableOn = searchParams.get("availableOn");
  if (availableOn) {
    const date = new Date(availableOn);
    if (!Number.isNaN(date.getTime())) conditions.push({
      OR: [{ availabilityDate: null }, { availabilityDate: { lte: date } }],
    });
  }
  const where: Prisma.ListingWhereInput = {
    status: { in: [ListingStatus.AVAILABLE, ListingStatus.COMING_SOON] },
    purpose: purpose ?? { in: settings.business.purposes as ListingPurpose[] },
    ...(Object.keys(price).length ? { price } : {}),
    ...(Number.isFinite(bedrooms) && bedrooms >= 0 ? { bedrooms: { gte: bedrooms } } : {}),
    ...(Number.isFinite(bathrooms) && bathrooms >= 0 ? { bathrooms: { gte: bathrooms } } : {}),
    ...(searchParams.get("type") ? { propertyType: searchParams.get("type")! } : {}),
    ...(searchParams.get("furnished") ? { furnished: searchParams.get("furnished")! } : {}),
    ...(amenities.length ? { amenities: { hasEvery: amenities } } : {}),
    ...(conditions.length ? { AND: conditions } : {}),
  };
  const [listings, total] = await Promise.all([
    db.listing.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { photos: { orderBy: { position: "asc" } } },
    }),
    db.listing.count({ where }),
  ]);
  return NextResponse.json({
    listings: listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      slug: listing.slug,
      purpose: listing.purpose,
      propertyType: listing.propertyType,
      price: Number(listing.price),
      currency: listing.currency,
      paymentPeriod: listing.paymentPeriod,
      bedrooms: listing.bedrooms,
      bathrooms: Number(listing.bathrooms),
      floorArea: listing.floorArea ? Number(listing.floorArea) : null,
      areaUnit: listing.areaUnit,
      city: listing.city,
      neighbourhood: listing.neighbourhood,
      region: listing.region,
      country: listing.country,
      availabilityDate: listing.availabilityDate,
      status: listing.status,
      photos: listing.photos.map((photo) => ({ url: photo.url, altText: photo.altText, caption: photo.caption, position: photo.position, cover: photo.cover })),
    })),
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize),
  });
}
