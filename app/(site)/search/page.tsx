import Link from "next/link";
import { ArrowLeft, ArrowRight, SlidersHorizontal } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { ListingCard } from "@/app/components/site";
import { amenityOptions } from "@/lib/defaults";
import type { Prisma } from "@prisma/client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const settings = await getSettings();
  const q = first(params.q)?.trim().slice(0, 120) || "";
  const purposeValue = first(params.purpose)?.toUpperCase();
  const purpose = settings.business.purposes.includes(purposeValue || "") ? purposeValue : "";
  const sort = first(params.sort) || "newest";
  const page = Math.max(1, Math.min(500, Number(first(params.page)) || 1));
  const minPrice = Number(first(params.minPrice));
  const maxPrice = Number(first(params.maxPrice));
  const bedrooms = Number(first(params.bedrooms));
  const bathrooms = Number(first(params.bathrooms));
  const type = first(params.type) || "";
  const furnished = first(params.furnished) || "";
  const selectedAmenities = (Array.isArray(params.amenity) ? params.amenity : params.amenity ? [params.amenity] : []).slice(0, 20);
  const availableOn = first(params.availableOn);
  const price: Prisma.DecimalFilter = {};
  if (Number.isFinite(minPrice) && minPrice >= 0) price.gte = minPrice;
  if (Number.isFinite(maxPrice) && maxPrice > 0) price.lte = maxPrice;
  const conditions: Prisma.ListingWhereInput[] = [];
  if (q) conditions.push({ OR: ["city", "neighbourhood", "address", "region", "postalCode"].map((field) => ({ [field]: { contains: q, mode: "insensitive" } })) });
  const availableDate = availableOn ? new Date(availableOn) : null;
  if (availableDate && !Number.isNaN(availableDate.getTime())) {
    conditions.push({ OR: [{ availabilityDate: null }, { availabilityDate: { lte: availableDate } }] });
  }
  const where: Prisma.ListingWhereInput = {
    status: { in: ["AVAILABLE", "COMING_SOON"] },
    purpose: purpose ? purpose as "RENT" | "SALE" : { in: settings.business.purposes as ("RENT" | "SALE")[] },
    ...(Object.keys(price).length ? { price } : {}),
    ...(Number.isFinite(bedrooms) && bedrooms > 0 ? { bedrooms: { gte: bedrooms } } : {}),
    ...(Number.isFinite(bathrooms) && bathrooms > 0 ? { bathrooms: { gte: bathrooms } } : {}),
    ...(type ? { propertyType: type } : {}),
    ...(furnished ? { furnished } : {}),
    ...(selectedAmenities.length ? { amenities: { hasEvery: selectedAmenities } } : {}),
    ...(conditions.length ? { AND: conditions } : {}),
  };
  const orderBy: Prisma.ListingOrderByWithRelationInput[] = sort === "price_asc"
    ? [{ price: "asc" }, { createdAt: "desc" }]
    : sort === "price_desc" ? [{ price: "desc" }, { createdAt: "desc" }] : [{ createdAt: "desc" }];
  const configured = Boolean(process.env.DATABASE_URL);
  const [listings, total, propertyTypes] = configured ? await Promise.all([
    db.listing.findMany({ where, orderBy, skip: (page - 1) * 12, take: 12, include: { photos: { orderBy: { position: "asc" } } } }),
    db.listing.count({ where }),
    db.listing.findMany({ where: { status: { in: ["AVAILABLE", "COMING_SOON"] }, purpose: { in: settings.business.purposes as ("RENT" | "SALE")[] } }, distinct: ["propertyType"], select: { propertyType: true }, orderBy: { propertyType: "asc" } }),
  ]) : [[], 0, []];
  const pages = Math.ceil(total / 12);
  const queryString = (nextPage: number) => {
    const next = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (key === "page" || value === undefined) return;
      (Array.isArray(value) ? value : [value]).forEach((part) => next.append(key, part));
    });
    next.set("page", String(nextPage));
    return `/search?${next.toString()}`;
  };
  return (
    <div className="search-page">
      <section className="search-heading shell"><span className="eyebrow">The right place is out there</span><h1>Find your next home.</h1><p>Search places to rent and discover the details that make a house feel like yours.</p></section>
      <div className="shell search-layout">
        <aside className="filter-panel">
          <div className="filter-title"><SlidersHorizontal size={17} /><strong>Refine your search</strong></div>
          <form action="/search" className="filters-form">
            <label>City or neighbourhood<input name="q" defaultValue={q} placeholder="Try Brooklyn or 10011" /></label>
            {settings.business.purposes.length > 1 && <label>Listing purpose<select name="purpose" defaultValue={purpose}><option value="">Rent or sale</option>{settings.business.purposes.map((item) => <option key={item} value={item.toLowerCase()}>{item === "RENT" ? "For rent" : "For sale"}</option>)}</select></label>}
            <div className="filter-pair"><label>Min price<input name="minPrice" type="number" min="0" placeholder="$ Any" defaultValue={first(params.minPrice)} /></label><label>Max price<input name="maxPrice" type="number" min="0" placeholder="$ Any" defaultValue={first(params.maxPrice)} /></label></div>
            <div className="filter-pair"><label>Bedrooms<select name="bedrooms" defaultValue={first(params.bedrooms) || ""}><option value="">Any</option>{[1,2,3,4,5].map((count) => <option key={count} value={count}>{count}{count === 5 ? "+" : ""} bedrooms</option>)}</select></label><label>Bathrooms<select name="bathrooms" defaultValue={first(params.bathrooms) || ""}><option value="">Any</option>{[1,1.5,2,2.5,3,4].map((count) => <option key={count} value={count}>{count}+ baths</option>)}</select></label></div>
            <label>Property type<select name="type" defaultValue={type}><option value="">Any type</option>{propertyTypes.map((item) => <option key={item.propertyType} value={item.propertyType}>{item.propertyType}</option>)}{!propertyTypes.length && <><option>Apartment</option><option>Condo</option><option>Townhouse</option></>}</select></label>
            <label>Furnishing<select name="furnished" defaultValue={furnished}><option value="">Any</option><option value="FURNISHED">Furnished</option><option value="UNFURNISHED">Unfurnished</option><option value="PARTIALLY_FURNISHED">Partly furnished</option></select></label>
            <label>Available by<input type="date" name="availableOn" defaultValue={availableOn} /></label>
            <fieldset className="amenities-filter"><legend>Amenities</legend>{amenityOptions.map((amenity) => <label key={amenity} className="check-line"><input type="checkbox" name="amenity" value={amenity} defaultChecked={selectedAmenities.includes(amenity)} />{amenity}</label>)}</fieldset>
            <input type="hidden" name="sort" value={sort} />
            <button className="button button-dark filter-submit">Show apartments</button>
            <Link href="/search" className="clear-filters">Clear all filters</Link>
          </form>
        </aside>
        <section className="results-area" aria-live="polite">
          <div className="results-top"><div><span className="eyebrow">Your search</span><h2>{configured ? `${total} ${total === 1 ? "apartment" : "apartments"} found` : "Search setup required"}</h2></div><div className="sort-control"><label htmlFor="sort-listings">Sort by</label><select id="sort-listings" name="sort" form="sort-form" defaultValue={sort}><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select><button type="submit" form="sort-form" className="sort-apply">Apply</button></div></div>
          <form action="/search" id="sort-form" className="sort-form">{Object.entries(params).filter(([key]) => key !== "sort" && key !== "page").map(([key,value]) => (Array.isArray(value) ? value : value === undefined ? [] : [value]).map((part,index) => <input key={`${key}-${index}`} type="hidden" name={key} value={part} />))}</form>
          {!configured ? <div className="result-message"><h3>Search will be ready after setup.</h3><p>Connect your PostgreSQL database to publish and search real apartments.</p></div>
            : listings.length ? <div className="listing-grid">{listings.map((listing) => <ListingCard key={listing.id} listing={{ ...listing, price: Number(listing.price), bathrooms: Number(listing.bathrooms), priceFormat: settings.business.priceFormat }} />)}</div>
              : <div className="result-message"><div className="empty-sun">A</div><h3>No apartments match those filters.</h3><p>Try a wider price range or remove one of your filters.</p><Link className="button button-dark" href="/search">Reset search <ArrowRight size={15} /></Link></div>}
          {pages > 1 && <nav className="pagination" aria-label="Search results pages">{page > 1 && <Link href={queryString(page - 1)}><ArrowLeft size={15} /> Previous</Link>}<span>Page {page} of {pages}</span>{page < pages && <Link href={queryString(page + 1)}>Next <ArrowRight size={15} /></Link>}</nav>}
        </section>
      </div>
    </div>
  );
}
