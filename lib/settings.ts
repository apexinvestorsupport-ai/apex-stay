import { db } from "@/lib/db";
import { defaultSettings } from "@/lib/defaults";

export type SiteSettings = typeof defaultSettings;

export async function getSettings(): Promise<SiteSettings> {
  if (!process.env.DATABASE_URL) return defaultSettings;
  const row = await db.siteSetting.findUnique({ where: { key: "site" } });
  if (!row || typeof row.value !== "object" || row.value === null) return defaultSettings;
  const value = row.value as Partial<SiteSettings>;
  return {
    brand: {
      ...defaultSettings.brand,
      ...value.brand,
      socialLinks: { ...defaultSettings.brand.socialLinks, ...value.brand?.socialLinks },
      navigation: value.brand?.navigation ?? defaultSettings.brand.navigation,
      footerLinks: value.brand?.footerLinks ?? defaultSettings.brand.footerLinks,
    },
    business: { ...defaultSettings.business, ...value.business },
    home: { ...defaultSettings.home, ...value.home },
    seo: { ...defaultSettings.seo, ...value.seo },
  };
}

export async function getPages() {
  const existing = await db.sitePage.findMany({ where: { published: true }, orderBy: { slug: "asc" } });
  return existing;
}
