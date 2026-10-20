import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { settingsSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireApiUser(["OWNER"]);
  if (auth.response) return auth.response;
  return NextResponse.json({ settings: await getSettings() });
}

export async function PUT(request: Request) {
  const auth = await requireApiUser(["OWNER"]);
  if (auth.response) return auth.response;
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  await db.$transaction(async (tx) => {
    await tx.siteSetting.upsert({
      where: { key: "site" },
      create: { key: "site", value: parsed.data },
      update: { value: parsed.data },
    });
    await tx.listing.updateMany({
      data: {
        currency: parsed.data.business.currency,
        country: parsed.data.business.country,
        areaUnit: parsed.data.business.areaUnit,
      },
    });
    await tx.auditEvent.create({
      data: { actorId: auth.user!.id, action: "settings.updated", entity: "settings", entityId: "site" },
    });
  });
  return NextResponse.json({ settings: parsed.data });
}
