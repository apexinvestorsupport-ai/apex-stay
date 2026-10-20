import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireApiUser(["OWNER", "MANAGER"]);
  if (auth.response) return auth.response;
  const users = await db.user.findMany({
    where: { active: true, role: { in: ["MANAGER", "AGENT"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ users });
}
