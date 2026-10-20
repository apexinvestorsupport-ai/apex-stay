import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/app/components/site";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    metadataBase: process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined,
    title: settings.seo.title,
    description: settings.seo.description,
    openGraph: {
      title: settings.seo.title,
      description: settings.seo.description,
      type: "website",
      images: settings.seo.socialImage ? [settings.seo.socialImage] : undefined,
    },
    icons: settings.brand.faviconUrl ? { icon: settings.brand.faviconUrl } : undefined,
  };
}

export default async function PublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  const settings = await getSettings();
  const theme = {
    "--brand-primary": settings.brand.primaryColor,
    "--brand-accent": settings.brand.accentColor,
  } as CSSProperties;
  return (
    <div className={`site-shell ${settings.brand.typography === "sans" ? "font-sans" : "font-serif"}`} style={theme}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader settings={settings} />
      <main id="main-content">{children}</main>
      <SiteFooter settings={settings} />
    </div>
  );
}
