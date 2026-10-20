import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, hitRateLimit, rateKey, requestIp } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Sign-in is unavailable until the database is configured." }, { status: 503 });
  }
  const allowed = await hitRateLimit(rateKey("login", requestIp(request)), 8, 15 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "Too many sign-in attempts. Try again in 15 minutes." }, { status: 429 });
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  const passwordValid = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  if (!user || !passwordValid || !user.active) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
