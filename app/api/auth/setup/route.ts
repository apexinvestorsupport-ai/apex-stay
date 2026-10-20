import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { constantTimeEqual, createSession } from "@/lib/auth";
import { hitRateLimit, rateKey, requestIp } from "@/lib/auth";
import { ownerSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ setupAvailable: false, configured: false });
  }
  const setupAvailable =
    Boolean(process.env.SETUP_SECRET) &&
    !(await db.user.findFirst({ where: { role: "OWNER" }, select: { id: true } }));
  return NextResponse.json({
    setupAvailable,
    configured: Boolean(process.env.DATABASE_URL && process.env.SETUP_SECRET),
  });
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Configure DATABASE_URL and apply the database migration before owner setup." }, { status: 503 });
  }
  if (!process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Owner setup is disabled until SETUP_SECRET is configured." }, { status: 503 });
  }
  if (!(await hitRateLimit(rateKey("owner-setup", requestIp(request)), 5, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many setup attempts. Try again in 15 minutes." }, { status: 429 });
  }
  const parsed = ownerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!constantTimeEqual(parsed.data.setupSecret, process.env.SETUP_SECRET)) {
    return NextResponse.json({ error: "Invalid setup secret." }, { status: 403 });
  }
  const result = await db.$transaction(async (tx) => {
    await tx.$executeRaw`LOCK TABLE "User" IN EXCLUSIVE MODE`;
    const owner = await tx.user.findFirst({ where: { role: "OWNER" }, select: { id: true } });
    if (owner) return null;
    return tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
        role: "OWNER",
      },
    });
  });
  if (!result) return NextResponse.json({ error: "An owner account has already been created." }, { status: 409 });
  await audit(result.id, "owner.setup", "user", result.id);
  await createSession(result.id);
  return NextResponse.json({ ok: true });
}
