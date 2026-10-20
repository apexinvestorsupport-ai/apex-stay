import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin } from "lucide-react";
import { money } from "@/lib/format";
import type { SiteSettings } from "@/lib/settings";
import { FavoriteButton } from "@/app/components/interactive";

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand-lockup" aria-label={`${settings.brand.name} home`}>
          {settings.brand.logoUrl
            ? <Image src={settings.brand.logoUrl} alt="" width={150} height={44} unoptimized className="brand-logo" />
            : <span className="brand-mark" aria-hidden="true">A</span>}
          <span>{settings.brand.name}</span>
        </Link>
        <nav className="primary-nav" aria-label="Main navigation">
          {settings.brand.navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <Link href="/search" className="button button-dark header-cta">Find a home <ArrowRight size={15} /></Link>
      </div>
    </header>
  );
}

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Link href="/" className="brand-lockup footer-brand">
            <span className="brand-mark" aria-hidden="true">A</span>{settings.brand.name}
          </Link>
          <p className="footer-tagline">{settings.brand.footerText}</p>
        </div>
        <div className="footer-links">{settings.brand.footerLinks.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</div>
        <div className="footer-contact">
          {settings.brand.address && <p><MapPin size={15} />{settings.brand.address}</p>}
          {settings.brand.contactEmail && settings.business.contactPreference !== "phone" && <a href={`mailto:${settings.brand.contactEmail}`}>{settings.brand.contactEmail}</a>}
          {settings.brand.contactPhone && settings.business.contactPreference !== "email" && <a href={`tel:${settings.brand.contactPhone}`}>{settings.brand.contactPhone}</a>}
          {Object.entries(settings.brand.socialLinks).filter(([, href]) => href).map(([name, href]) => <a key={name} href={href} target="_blank" rel="noreferrer">{name[0].toUpperCase()+name.slice(1)}</a>)}
        </div>
      </div>
      <div className="shell footer-bottom"><span>© {new Date().getFullYear()} {settings.brand.name}</span><span>Made for finding your place.</span></div>
    </footer>
  );
}

export type ListingCardData = {
  id: string;
  title: string;
  slug: string;
  purpose: string;
  propertyType: string;
  price: number;
  currency: string;
  priceFormat?: "whole" | "precise";
  paymentPeriod: string;
  bedrooms: number;
  bathrooms: number;
  city: string;
  neighbourhood: string | null;
  status: string;
  photos: { url: string; altText: string; cover: boolean; position: number }[];
};

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const image = listing.photos.find((photo) => photo.cover) ?? listing.photos[0];
  return (
    <article className="listing-card">
      <div className="listing-image-wrap">
        <Link href={`/apartments/${listing.slug}`} className="listing-photo-link" aria-label={`View ${listing.title}`}>
          {image
            ? <Image src={image.url} alt={image.altText} width={800} height={560} unoptimized className="listing-photo" loading="lazy" sizes="(max-width: 760px) 50vw, 33vw" />
            : <div className="photo-placeholder"><span>A place to call yours</span></div>}
          <span className="listing-badge">{listing.status === "COMING_SOON" ? "Coming soon" : listing.purpose === "SALE" ? "For sale" : "For rent"}</span>
        </Link>
        <div className="listing-favorite"><FavoriteButton listingId={listing.id} /></div>
      </div>
      <div className="listing-card-content">
        <div className="listing-price">{money(listing.price, listing.currency, listing.priceFormat)}<span>{listing.purpose === "RENT" ? ` / ${listing.paymentPeriod}` : ""}</span></div>
        <Link href={`/apartments/${listing.slug}`} className="listing-title">{listing.title}</Link>
        <p className="listing-location"><MapPin size={14} />{listing.neighbourhood ? `${listing.neighbourhood}, ` : ""}{listing.city}</p>
        <div className="listing-facts"><span>{listing.bedrooms} bd</span><i /><span>{listing.bathrooms} ba</span><i /><span>{listing.propertyType}</span></div>
      </div>
    </article>
  );
}
