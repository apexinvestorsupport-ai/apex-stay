import { redirect } from "next/navigation";

export default async function SetupPage() {
  const result = process.env.DATABASE_URL
    ? await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/setup`, { cache: "no-store" }).then((response) => response.json())
    : { setupAvailable: false, configured: false };
  if (result.setupAvailable) redirect("/admin/login");
  redirect("/admin/login?setup=unavailable");
}
