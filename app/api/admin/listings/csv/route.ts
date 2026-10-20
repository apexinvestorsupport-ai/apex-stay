import Papa from "papaparse";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { listingSchema } from "@/lib/validation";

const columns = [
  "title", "slug", "description", "purpose", "propertyType", "price", "paymentPeriod",
  "address", "neighbourhood", "city", "region", "postalCode", "country", "latitude",
  "longitude", "bedrooms", "bathrooms", "floorArea", "areaUnit", "furnished", "amenities",
  "utilities", "availabilityDate", "status", "featured", "ownerName", "ownerEmail",
  "ownerPhone", "displayOwnerContact", "viewingInstructions", "seoTitle", "seoDescription",
];

function safeCell(value: unknown) {
  const text = value == null ? "" : String(value);
  const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const listings = await db.listing.findMany({
    where: auth.user!.role === "AGENT" ? { assignedToId: auth.user!.id } : {},
    include: { photos: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 10000,
  });
  const lines = [
    columns.join(","),
    ...listings.map((listing) => {
      const row: Record<string, unknown> = {
        ...listing,
        price: String(listing.price),
        bathrooms: String(listing.bathrooms),
        floorArea: listing.floorArea == null ? "" : String(listing.floorArea),
        latitude: listing.latitude == null ? "" : String(listing.latitude),
        longitude: listing.longitude == null ? "" : String(listing.longitude),
        availabilityDate: listing.availabilityDate?.toISOString().slice(0, 10) ?? "",
        amenities: listing.amenities.join("|"),
        utilities: listing.utilities.join("|"),
        featured: String(listing.featured),
        displayOwnerContact: String(listing.displayOwnerContact),
      };
      return columns.map((column) => safeCell(row[column])).join(",");
    }),
  ];
  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="apex-stay-listings.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const payload = await request.json().catch(() => null) as { csv?: unknown } | null;
  if (typeof payload?.csv !== "string" || payload.csv.length > 2_000_000) {
    return NextResponse.json({ error: "Upload a CSV file under 2 MB." }, { status: 400 });
  }
  const parsed = Papa.parse<Record<string, string>>(payload.csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
  if (parsed.errors.length) {
    return NextResponse.json({
      error: "The CSV could not be parsed. Check its headers, commas, and quoted text.",
      issues: parsed.errors.slice(0, 25).map((issue) => ({ row: (issue.row ?? 0) + 2, message: issue.message })),
    }, { status: 400 });
  }
  if (!parsed.meta.fields?.includes("title") || !parsed.meta.fields.includes("slug")) {
    return NextResponse.json({ error: "The CSV must include the title and slug columns. Download the template to see all supported columns." }, { status: 400 });
  }
  if (parsed.data.length < 1 || parsed.data.length > 500) {
    return NextResponse.json({ error: "Import between 1 and 500 listing rows at a time." }, { status: 400 });
  }
  const settings = await getSettings();
  const slugs = parsed.data.map((row) => row.slug?.trim()).filter(Boolean);
  const duplicateSlugs = new Set(slugs.filter((slug, index) => slugs.indexOf(slug) !== index));
  const existing = await db.listing.findMany({ where: { slug: { in: [...new Set(slugs)] } }, select: { slug: true } });
  const existingSlugs = new Set(existing.map((row) => row.slug));
  const preview: { row: number; title: string; slug: string; city: string; purpose: string; price: string; status: string; errors: string[] }[] = [];
  const validRows: Record<string, unknown>[] = [];
  for (const [index, row] of parsed.data.entries()) {
    const mapped = {
      title: row.title ?? "",
      slug: row.slug ?? "",
      description: row.description ?? "",
      purpose: (row.purpose || "RENT").toUpperCase(),
      propertyType: row.propertyType || "Apartment",
      price: row.price,
      paymentPeriod: row.paymentPeriod || "month",
      address: row.address ?? "",
      neighbourhood: row.neighbourhood ?? "",
      city: row.city ?? "",
      region: row.region ?? "",
      postalCode: row.postalCode ?? "",
      country: row.country || "United States",
      latitude: row.latitude || "",
      longitude: row.longitude || "",
      bedrooms: row.bedrooms || "0",
      bathrooms: row.bathrooms || "1",
      floorArea: row.floorArea || "",
      areaUnit: row.areaUnit || "sq ft",
      furnished: (row.furnished || "UNFURNISHED").toUpperCase(),
      amenities: row.amenities ? row.amenities.split("|").map((item) => item.trim()).filter(Boolean) : [],
      utilities: row.utilities ? row.utilities.split("|").map((item) => item.trim()).filter(Boolean) : [],
      availabilityDate: row.availabilityDate || "",
      status: (row.status || "DRAFT").toUpperCase(),
      featured: /^(true|1|yes)$/i.test(row.featured || ""),
      ownerName: row.ownerName || "",
      ownerEmail: row.ownerEmail || "",
      ownerPhone: row.ownerPhone || "",
      displayOwnerContact: /^(true|1|yes)$/i.test(row.displayOwnerContact || ""),
      viewingInstructions: row.viewingInstructions || "",
      seoTitle: row.seoTitle || "",
      seoDescription: row.seoDescription || "",
      assignedToId: auth.user!.role === "AGENT" ? auth.user!.id : "",
      photos: [],
    };
    const errors: string[] = [];
    const valid = listingSchema.safeParse(mapped);
    if (!valid.success) {
      for (const [field, messages] of Object.entries(valid.error.flatten().fieldErrors)) {
        if (messages?.length) errors.push(`${field}: ${messages[0]}`);
      }
    }
    const slug = row.slug?.trim() ?? "";
    if (duplicateSlugs.has(slug)) errors.push("slug: duplicate in this file");
    if (existingSlugs.has(slug)) errors.push("slug: already exists");
    if (!settings.business.purposes.includes(mapped.purpose)) errors.push("purpose: disabled in business settings");
    preview.push({
      row: index + 2,
      title: row.title || "",
      slug,
      city: row.city || "",
      purpose: (row.purpose || "RENT").toUpperCase(),
      price: row.price || "",
      status: (row.status || "DRAFT").toUpperCase(),
      errors,
    });
    if (!errors.length && valid.success) validRows.push(valid.data);
  }
  const allValid = preview.every((row) => row.errors.length === 0);
  if (!allValid) return NextResponse.json({ preview, previewId: null, total: preview.length });
  const token = await db.csvImportPreview.create({
    data: {
      userId: auth.user!.id,
      rows: validRows as never,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  return NextResponse.json({ preview, previewId: token.id, total: preview.length });
}
