import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AccessForm } from "@/app/admin/access-form";
import { db } from "@/lib/db";

export default async function LoginPage() {
  const configured = Boolean(process.env.DATABASE_URL);
  if (configured && await currentUser()) redirect("/admin");
  const hasOwner = configured ? Boolean(await db.user.findFirst({ where: { role: "OWNER" }, select: { id: true } })) : true;
  return <AccessForm setupAvailable={configured && Boolean(process.env.SETUP_SECRET) && !hasOwner} configured={configured} ownerExists={hasOwner} />;
}
