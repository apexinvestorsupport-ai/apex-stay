import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const payload = await request.json().catch(() => null) as { previewId?: unknown } | null;
  if (typeof payload?.previewId !== "string") return NextResponse.json({ error: "Validate a CSV preview before importing." }, { status: 400 });
  const preview = await db.csvImportPreview.findFirst({
    where: { id: payload.previewId, userId: auth.user!.id, expiresAt: { gt: new Date() } },
  });
  if (!preview) return NextResponse.json({ error: "The import preview expired or belongs to another user. Upload and preview the CSV again." }, { status: 404 });
  const settings = await getSettings();
  const rows = Array.isArray(preview.rows) ? preview.rows : [];
  const created = await db.$transaction(async (tx) => {
    const records: { id: string; title: string; slug: string }[] = [];
    for (const source of rows) {
      if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("The stored import preview is invalid.");
      const row = source as Record<string, unknown>;
      const title = String(row.title);
      const slug = String(row.slug);
      if (!settings.business.purposes.includes(String(row.purpose))) {
        throw new Error(`Listing purpose for "${title}" has been disabled since preview.`);
      }
      const record = await tx.listing.create({
        data: {
          title,
          slug,
          description: String(row.description),
          purpose: String(row.purpose) as "RENT" | "SALE",
          propertyType: String(row.propertyType),
          price: Number(row.price),
          paymentPeriod: String(row.paymentPeriod),
          currency: settings.business.currency,
          address: String(row.address),
          neighbourhood: row.neighbourhood ? String(row.neighbourhood) : null,
          city: String(row.city),
          region: String(row.region),
          postalCode: row.postalCode ? String(row.postalCode) : null,
          country: settings.business.country,
          latitude: row.latitude === "" || row.latitude == null ? null : Number(row.latitude as string | number),
          longitude: row.longitude === "" || row.longitude == null ? null : Number(row.longitude as string | number),
          bedrooms: Number(row.bedrooms),
          bathrooms: Number(row.bathrooms),
          floorArea: row.floorArea === "" || row.floorArea == null ? null : Number(row.floorArea as string | number),
          areaUnit: settings.business.areaUnit,
          furnished: String(row.furnished),
          amenities: Array.isArray(row.amenities) ? row.amenities.map(String) : [],
          utilities: Array.isArray(row.utilities) ? row.utilities.map(String) : [],
          availabilityDate: row.availabilityDate ? new Date(String(row.availabilityDate)) : null,
          status: String(row.status) as "DRAFT" | "AVAILABLE" | "COMING_SOON" | "RENTED_SOLD" | "ARCHIVED",
          featured: Boolean(row.featured),
          ownerName: row.ownerName ? String(row.ownerName) : null,
          ownerEmail: row.ownerEmail ? String(row.ownerEmail) : null,
          ownerPhone: row.ownerPhone ? String(row.ownerPhone) : null,
          displayOwnerContact: Boolean(row.displayOwnerContact),
          viewingInstructions: row.viewingInstructions ? String(row.viewingInstructions) : null,
          seoTitle: row.seoTitle ? String(row.seoTitle) : null,
          seoDescription: row.seoDescription ? String(row.seoDescription) : null,
          assignedToId: auth.user!.role === "AGENT" ? auth.user!.id : null,
          photos: { create: [] },
        },
        select: { id: true, title: true, slug: true },
      });
      await tx.auditEvent.create({
        data: {
          actorId: auth.user!.id,
          action: "listing.csv_imported",
          entity: "listing",
          entityId: record.id,
          details: { status: String(row.status), source: "CSV" } as Prisma.InputJsonValue,
        },
      });
      records.push(record);
    }
    await tx.csvImportPreview.delete({ where: { id: preview.id } });
    return records;
  });
  return NextResponse.json({ imported: created.length, listings: created });
}
