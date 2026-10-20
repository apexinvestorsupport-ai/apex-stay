import Link from "next/link";
import { ArrowDownRight, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { defaultSettings } from "@/lib/defaults";
import { getSettings } from "@/lib/settings";
import { ListingCard } from "@/app/components/site";

export default async function Home() {
  const settings = await getSettings();
  const configured = Boolean(process.env.DATABASE_URL);
  const [featured, recent] = configured
    ? await Promise.all([
        db.listing.findMany({
          where: { status: "AVAILABLE", featured: true, purpose: { in: settings.business.purposes as ("RENT" | "SALE")[] } },
          include: { photos: { orderBy: { position: "asc" } } },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
        db.listing.findMany({
          where: { status: { in: ["AVAILABLE", "COMING_SOON"] }, purpose: { in: settings.business.purposes as ("RENT" | "SALE")[] } },
          include: { photos: { orderBy: { position: "asc" } } },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
      ])
    : [[], []];
  const purposeChoices = settings.business.purposes;
  return (
    <>
      <section className="hero">
        <div className="hero-image" style={{ backgroundImage: `linear-gradient(90deg, rgba(16,38,34,.60), rgba(16,38,34,.08)), url("${settings.home.heroImage}")` }} />
        <div className="shell hero-content">
          <span className="eyebrow light-eyebrow">{settings.home.eyebrow}</span>
          <h1>{settings.home.headline}</h1>
          <p>{settings.home.description}</p>
          <form className="hero-search" action="/search">
            <label htmlFor="hero-location">Where would you like to live?</label>
            <div className="hero-search-row">
              <input id="hero-location" name="q" placeholder="City, neighbourhood, or ZIP code" />
              {purposeChoices.length > 1 && <select aria-label="Listing purpose" name="purpose"><option value="">Rent or buy</option>{purposeChoices.map((purpose) => <option key={purpose} value={purpose.toLowerCase()}>{purpose === "RENT" ? "For rent" : "For sale"}</option>)}</select>}
              <button className="button button-accent">Search homes <ArrowRight size={16} /></button>
            </div>
          </form>
          <div className="hero-proof"><span><Check size={15} /> Thoughtful local listings</span><span><Check size={15} /> Real people, here to help</span></div>
        </div>
        <div className="hero-index"><span>01</span><i /> A place to begin</div>
      </section>

      {!configured && (
        <section className="setup-notice shell" role="status">
          <ShieldCheck size={19} />
          <p><strong>Database setup required.</strong> Connect PostgreSQL by setting <code>DATABASE_URL</code> and applying the schema before publishing listings. No sample property data is being shown.</p>
        </section>
      )}

      <section className="section shell">
        <div className="section-heading">
          <div><span className="eyebrow">A considered collection</span><h2>Homes worth coming home to.</h2></div>
          <Link className="text-link" href="/search">Explore all apartments <ArrowRight size={16} /></Link>
        </div>
        {featured.length ? <div className="listing-grid">{featured.map((listing) => <ListingCard key={listing.id} listing={{ ...listing, price: Number(listing.price), bathrooms: Number(listing.bathrooms), priceFormat: settings.business.priceFormat }} />)}</div>
          : <div className="empty-collection"><div className="empty-art"><span>HOME</span><ArrowDownRight size={30} /></div><div><h3>{configured ? "The next good find is yours to publish." : "Beautiful places are on the way."}</h3><p>{configured ? "Featured homes will appear here once your team publishes listings and marks them as featured." : "After the database is connected and listings are added, your collection will appear here."}</p></div><Link className="text-link" href={configured ? "/admin/login" : "/search"}>{configured ? "Team sign in" : "Browse apartments"} <ArrowRight size={15} /></Link></div>}
      </section>

      <section className="editorial-band">
        <div className="shell editorial-content">
          <div className="editorial-index">A better move<br />starts here.</div>
          <div><span className="eyebrow light-eyebrow">A little more human</span><h2>{settings.home.aboutTitle || defaultSettings.home.aboutTitle}</h2><p>{settings.home.aboutBody}</p><Link href="/about" className="button button-outline-light">Get to know us <ArrowRight size={15} /></Link></div>
          <div className="editorial-quote">“{settings.brand.tagline}”</div>
        </div>
      </section>

      <section className="section shell recent-section">
        <div className="section-heading">
          <div><span className="eyebrow">Just listed</span><h2>Fresh on the market.</h2></div>
          <Link className="text-link" href="/search?sort=newest">See the latest <ArrowRight size={16} /></Link>
        </div>
        {recent.length ? <div className="listing-grid">{recent.map((listing) => <ListingCard key={listing.id} listing={{ ...listing, price: Number(listing.price), bathrooms: Number(listing.bathrooms), priceFormat: settings.business.priceFormat }} />)}</div>
          : <p className="muted spacious-empty">{configured ? "Newly published apartments will show up here." : "Recently added apartments will appear here after setup."}</p>}
      </section>

      <section className="trust-strip"><div className="shell trust-items"><div><span className="trust-number">01</span><div><strong>Real homes</strong><span>Thoughtfully presented places to live.</span></div></div><div><span className="trust-number">02</span><div><strong>Helpful people</strong><span>A direct line to local owners and agents.</span></div></div><div><span className="trust-number">03</span><div><strong>Clear next steps</strong><span>Simple enquiries, no guesswork.</span></div></div></div></section>
    </>
  );
}
