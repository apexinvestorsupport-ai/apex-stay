import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enquirySchema } from "@/lib/validation";
import { hashValue, hitRateLimit, rateKey, requestIp } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Enquiries are unavailable until the database is configured." }, { status: 503 });
  }
  const ip = requestIp(request);
  if (!(await hitRateLimit(rateKey("enquiry", ip), 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many messages from this connection. Please try again later." }, { status: 429 });
  }
  const parsed = enquirySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  let listingTitle: string | undefined;
  let assignedToId: string | undefined;
  if (data.listingId) {
    const listing = await db.listing.findFirst({
      where: { id: data.listingId, status: { in: ["AVAILABLE", "COMING_SOON"] } },
      select: { id: true, title: true, assignedToId: true },
    });
    if (!listing) return NextResponse.json({ error: "This apartment is no longer available." }, { status: 404 });
    listingTitle = listing.title;
    assignedToId = listing.assignedToId ?? undefined;
  }
  const enquiry = await db.enquiry.create({
    data: {
      listingId: data.listingId || null,
      assignedToId,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      message: data.message,
      consent: true,
      ipHash: hashValue(ip),
    },
  });
  let emailStatus: "not_configured" | "sent" | "failed" = "not_configured";
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM) {
    const settings = await getSettings();
    if (settings.brand.contactEmail) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM,
            to: settings.brand.contactEmail,
            subject: `New enquiry${listingTitle ? `: ${listingTitle}` : ""}`,
            text: `From: ${data.name} (${data.email})\nPhone: ${data.phone || "Not provided"}\n\n${data.message}`,
          }),
        });
        emailStatus = response.ok ? "sent" : "failed";
        if (!response.ok) console.error("Email provider rejected enquiry notification", response.status);
      } catch (error) {
        emailStatus = "failed";
        console.error("Could not send enquiry notification", error);
      }
    }
  }
  return NextResponse.json({ ok: true, id: enquiry.id, emailStatus }, { status: 201 });
}
