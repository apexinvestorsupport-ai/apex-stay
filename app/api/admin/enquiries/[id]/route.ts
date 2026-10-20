import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { enquiryUpdateSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const existing = await db.enquiry.findUnique({ where: { id }, select: { id: true, assignedToId: true } });
  if (!existing) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
  if (auth.user!.role === "AGENT" && existing.assignedToId !== auth.user!.id) {
    return NextResponse.json({ error: "This enquiry is not assigned to you." }, { status: 403 });
  }
  const parsed = enquiryUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (auth.user!.role === "AGENT" && parsed.data.assignedToId !== undefined && parsed.data.assignedToId !== auth.user!.id) {
    return NextResponse.json({ error: "Agents cannot reassign enquiries." }, { status: 403 });
  }
  if (parsed.data.assignedToId) {
    const assignee = await db.user.findFirst({ where: { id: parsed.data.assignedToId, active: true } });
    if (!assignee || assignee.role === "OWNER") return NextResponse.json({ error: "Choose an active manager or agent." }, { status: 400 });
  }
  const updated = await db.enquiry.update({
    where: { id },
    data: { ...parsed.data },
  });
  await audit(auth.user!.id, "enquiry.updated", "enquiry", id, { status: updated.status });
  return NextResponse.json({ enquiry: updated });
}
