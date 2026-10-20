import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

type Context = { params: Promise<{ id: string }> };
const userSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(254).optional(),
  password: z.string().min(12).max(128).optional(),
  role: z.enum(["MANAGER", "AGENT"]).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireApiUser(["OWNER"]);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (id === auth.user!.id) return NextResponse.json({ error: "Use a separate owner account to change your own access." }, { status: 400 });
  const parsed = userSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !Object.keys(parsed.data ?? {}).length) return NextResponse.json({ error: "Enter valid user changes." }, { status: 400 });
  const data = parsed.data;
  const { password, name, email, role, active } = data;
  const updated = await db.user.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email: email.toLowerCase() } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  if (!updated.active || password) await db.session.deleteMany({ where: { userId: id } });
  await audit(auth.user!.id, "user.updated", "user", id, { role: updated.role, active: updated.active });
  return NextResponse.json({ user: updated });
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireApiUser(["OWNER"]);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (id === auth.user!.id) return NextResponse.json({ error: "You cannot delete your own owner account." }, { status: 400 });
  const user = await db.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!user || user.role === "OWNER") return NextResponse.json({ error: "The requested user cannot be removed." }, { status: 404 });
  await db.user.delete({ where: { id } });
  await audit(auth.user!.id, "user.deleted", "user", id);
  return NextResponse.json({ ok: true });
}
