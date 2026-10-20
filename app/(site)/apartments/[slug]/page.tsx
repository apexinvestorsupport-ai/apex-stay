import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Bath, BedDouble, CalendarDays, Check, MapPin, Ruler } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, money } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { EnquiryForm, FavoriteButton } from "@/app/components/interactive";

type Context = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  if (!process.env.DATABASE_URL) return { title: "Apartment details" };
  const { slug } = await params;
  const settings = await getSettings();
  const listing = await db.listing.findFirst({
    where: { slug, status: { in: ["AVAILABLE", "COMING_SOON"] }, purpose: { in: settings.business.purposes as ("RENT" | "SALE")[] } },
    include: { photos: { orderBy: { position: "asc" } } },
  });
  if (!listing) return { title: "Apartment not found" };
  return {
    title: listing.seoTitle || `${listing.title} | ${settings.brand.name}`,
    description: listing.seoDescription || listing.description.slice(0, 155),
    alternates: { canonical: `/apartments/${listing.slug}` },
    openGraph: {
      title: listing.seoTitle || listing.title,
      description: listing.seoDescription || listing.description.slice(0, 155),
      images: listing.photos[0] ? [listing.photos[0].url] : [],
      type: "article",
    },
  };
}

export default async function ApartmentPage({ params }: Context) {
  if (!process.env.DATABASE_URL) notFound();
  const { slug } = await params;
  const settings = await getSettings();
  const listing = await db.listing.findFirst({
    where: {
      slug,
      status: { in: ["AVAILABLE", "COMING_SOON"] },
      purpose: { in: settings.business.purposes as ("RENT" | "SALE")[] },
    },
    include: { photos: { orderBy: { position: "asc" } } },
  });
  if (!listing) notFound();
  const photos = listing.photos;
  const address = [listing.address, listing.neighbourhood, listing.city, listing.region, listing.postalCode].filter(Boolean).join(", ");
  const showContact = listing.displayOwnerContact && settings.business.showOwnerContact;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Apartment",
    name: listing.title,
    description: listing.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: listing.address,
      addressLocality: listing.city,
      addressRegion: listing.region,
      postalCode: listing.postalCode,
      addressCountry: listing.country,
    },
    numberOfBedrooms: listing.bedrooms,
    numberOfBathroomsTotal: Number(listing.bathrooms),
    image: photos.map((photo) => photo.url),
    offers: {
      "@type": "Offer",
      price: Number(listing.price),
      priceCurrency: listing.currency,
      availability: listing.status === "AVAILABLE" ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
    },
  };
  return (
    <div className="detail-page shell">
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/search">Apartments</Link><span>/</span><span>{listing.title}</span></nav>
      <div className="detail-title-row"><div><span className="eyebrow">{listing.status === "COMING_SOON" ? "Coming soon" : listing.purpose === "RENT" ? "For rent" : "For sale"} · {listing.propertyType}</span><h1>{listing.title}</h1><p className="listing-location"><MapPin size={16} />{address}</p></div><FavoriteButton listingId={listing.id} /></div>
      <div className={`photo-gallery ${photos.length === 0 ? "gallery-empty" : photos.length === 1 ? "gallery-single" : ""}`}>
        {photos.length ? photos.slice(0, 5).map((photo, index) => <div className={`gallery-photo gallery-photo-${index}`} key={photo.id}><Image src={photo.url} alt={photo.altText || photo.caption || listing.title} fill sizes="(max-width: 760px) 100vw, 70vw" unoptimized />{photo.caption && <span className="photo-caption">{photo.caption}</span>}</div>) : <div className="gallery-placeholder"><span>Photographs coming soon</span></div>}
      </div>
      <div className="detail-layout">
        <article className="detail-copy">
          <div className="price-card">          <div><span className="eyebrow">{listing.purpose === "RENT" ? "Monthly rent" : "Asking price"}</span><strong>{money(Number(listing.price), listing.currency, settings.business.priceFormat)}{listing.purpose === "RENT" && <small> / {listing.paymentPeriod}</small>}</strong></div><a href="#enquiry" className="button button-dark">Ask about this home</a></div>
          <div className="facts-strip"><span><BedDouble />{listing.bedrooms} bedrooms</span><span><Bath />{Number(listing.bathrooms)} bathrooms</span>{listing.floorArea && <span><Ruler />{Number(listing.floorArea).toLocaleString()} {listing.areaUnit}</span>}<span><CalendarDays />{listing.availabilityDate ? `Available ${formatDate(listing.availabilityDate, settings.business.dateFormat)}` : "Availability by enquiry"}</span></div>
          <section className="detail-section"><span className="eyebrow">The apartment</span><h2>A little more about this place.</h2><p className="description-text">{listing.description}</p></section>
          {listing.amenities.length > 0 && <section className="detail-section"><span className="eyebrow">Thoughtful details</span><h2>Features & amenities</h2><ul className="amenity-list">{listing.amenities.map((amenity) => <li key={amenity}><Check size={16} />{amenity}</li>)}</ul></section>}
          {listing.utilities.length > 0 && <section className="detail-section"><span className="eyebrow">Included utilities</span><ul className="amenity-list">{listing.utilities.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul></section>}
          <section className="detail-section location-section"><span className="eyebrow">The neighbourhood</span><h2>Rooted in {listing.city}.</h2><p>{address}</p><p className="muted">Ask the property contact about the neighbourhood, nearby transit, and local amenities.</p></section>
          {showContact && (listing.ownerName || listing.ownerEmail || listing.ownerPhone) && <section className="detail-section"><span className="eyebrow">Your property contact</span><h2>{listing.ownerName || "Owner or agent"}</h2>{listing.ownerEmail && <p><a className="text-link" href={`mailto:${listing.ownerEmail}`}>{listing.ownerEmail}</a></p>}{listing.ownerPhone && <p><a className="text-link" href={`tel:${listing.ownerPhone}`}>{listing.ownerPhone}</a></p>}</section>}
        </article>
        <aside className="detail-enquiry" id="enquiry"><EnquiryForm listingId={listing.id} title={listing.title} /></aside>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    </div>
  );
}
