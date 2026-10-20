import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AdminWorkspace } from "@/app/admin/workspace";
import { getSettings } from "@/lib/settings";

export default async function AdminPage() {
  if (!process.env.DATABASE_URL) redirect("/admin/login?database=required");
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  const settings = await getSettings();
  return <AdminWorkspace user={{ id: user.id, name: user.name, email: user.email, role: user.role }} defaults={{
    country: settings.business.country,
    areaUnit: settings.business.areaUnit,
    paymentPeriod: settings.business.paymentPeriod,
  }} />;
}
