import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/format";

type Context = { params: Promise<{ id: string }> };

export default async function ListingPreview({ params }: Context) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  const { id } = await params;
  const [listing, settings] = await Promise.all([
    db.listing.findUnique({ where: { id }, include: { photos: { orderBy: { position: "asc" } } } }),
    getSettings(),
  ]);
  if (!listing || (user.role === "AGENT" && listing.assignedToId !== user.id)) notFound();
  const image = listing.photos.find((photo) => photo.cover) ?? listing.photos[0];
  return <main className="preview-page shell">
    <div className="preview-admin-bar"><Link href="/admin"><ArrowLeft size={15}/> Back to dashboard</Link><span className={`status-pill status-${listing.status.toLowerCase()}`}>{listing.status.replace("_"," ").toLowerCase()} · private preview</span></div>
    <div className="preview-photo">{image?<Image src={image.url} alt={image.altText} fill sizes="(max-width: 760px) 100vw, 75vw" unoptimized/>:<span>Listing has no photographs yet</span>}</div>
    <div className="preview-copy"><span className="eyebrow">{listing.purpose==="RENT"?"For rent":"For sale"} · {listing.propertyType}</span><h1>{listing.title}</h1><p className="listing-location"><MapPin size={15}/>{[listing.address,listing.city,listing.region,listing.postalCode].filter(Boolean).join(", ")}</p><strong>{money(Number(listing.price),listing.currency,settings.business.priceFormat)}{listing.purpose==="RENT"&&<small> / {listing.paymentPeriod}</small>}</strong><div className="preview-description">{listing.description}</div><p className="field-hint">This preview is private to signed-in staff. Public pages only show listings set to Available or Coming soon.</p></div>
  </main>;
}
