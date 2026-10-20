import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireApiUser(["OWNER"]);
  if (auth.response) return auth.response;
  const events = await db.auditEvent.findMany({
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ events });
}
