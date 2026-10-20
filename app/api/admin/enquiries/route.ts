import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const enquiries = await db.enquiry.findMany({
    where: {
      ...(auth.user!.role === "AGENT" ? { assignedToId: auth.user!.id } : {}),
      ...(status && ["NEW", "CONTACTED", "VIEWING", "CLOSED", "SPAM"].includes(status) ? { status: status as never } : {}),
    },
    include: { listing: { select: { title: true, slug: true } }, assignedTo: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ enquiries });
}
