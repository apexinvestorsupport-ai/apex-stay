import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  role: z.enum(["MANAGER", "AGENT"]),
});

export async function GET() {
  const auth = await requireApiUser(["OWNER"]);
  if (auth.response) return auth.response;
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(["OWNER"]);
  if (auth.response) return auth.response;
  const parsed = createUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
        role: parsed.data.role as Role,
      },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    await audit(auth.user!.id, "user.created", "user", user.id, { role: user.role });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "That email address already has an account." }, { status: 409 });
    }
    throw error;
  }
}
