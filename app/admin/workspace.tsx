"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Building2, Check,
  ChevronDown, FileDown, FileText, Inbox, LayoutDashboard, LogOut, Plus, Save,
  Settings2, ShieldCheck, Trash2, Users, X,
} from "lucide-react";
import { defaultPages, amenityOptions, utilityOptions } from "@/lib/defaults";
import { defaultSettings } from "@/lib/defaults";
import type { SiteSettings } from "@/lib/settings";
import type { Role } from "@prisma/client";
import { money } from "@/lib/format";

type UserInfo = { id: string; name: string; email: string; role: Role };
type Photo = { id?: string; url: string; caption: string; altText: string; position: number; cover: boolean };
type ListingRow = {
  id: string; title: string; slug: string; status: string; purpose: string; price: string | number;
  currency: string; paymentPeriod: string; bedrooms: number; bathrooms: string | number;
  city: string; updatedAt: string; assignedToId: string | null;
  photos: Photo[]; assignedTo?: { id: string; name: string; email: string } | null;
};
type ListingDraft = {
  title: string; slug: string; description: string; purpose: "RENT" | "SALE";
  propertyType: string; price: string; paymentPeriod: string; address: string;
  neighbourhood: string; city: string; region: string; postalCode: string; country: string;
  latitude: string; longitude: string; bedrooms: string; bathrooms: string;
  floorArea: string; areaUnit: string; furnished: string; amenities: string[];
  utilities: string[]; availabilityDate: string; status: string; featured: boolean;
  ownerName: string; ownerEmail: string; ownerPhone: string; displayOwnerContact: boolean;
  viewingInstructions: string; seoTitle: string; seoDescription: string;
  assignedToId: string; photos: Photo[];
};
type EnquiryRow = {
  id: string; name: string; email: string; phone: string | null; message: string;
  status: string; notes: string | null; createdAt: string;
  listing: { title: string; slug: string } | null;
  assignedTo: { id: string; name: string } | null;
};
type StaffRow = { id: string; name: string; email: string; role: Role; active: boolean; createdAt: string };
type SitePage = { slug: string; title: string; body: string; metaTitle: string; metaDescription: string; published: boolean };
type CsvRow = { row: number; title: string; slug: string; city: string; purpose: string; price: string; status: string; errors: string[] };
type Tab = "overview" | "listings" | "enquiries" | "content" | "settings" | "team" | "audit";

const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard; owner?: boolean }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "listings", label: "Listings", icon: Building2 },
  { id: "enquiries", label: "Enquiries", icon: Inbox },
  { id: "content", label: "Website content", icon: FileText, owner: true },
  { id: "settings", label: "Brand & business", icon: Settings2, owner: true },
  { id: "team", label: "Team access", icon: Users, owner: true },
  { id: "audit", label: "Activity history", icon: Activity, owner: true },
];

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof result.error === "string" ? result.error : "The request could not be completed.";
    throw new Error(message);
  }
  return result as T;
}

type ListingDefaults = { country: string; areaUnit: string; paymentPeriod: string };

const blankListing = (defaults?: ListingDefaults): ListingDraft => ({
  title: "", slug: "", description: "", purpose: "RENT", propertyType: "Apartment",
  price: "", paymentPeriod: defaults?.paymentPeriod ?? "month", address: "", neighbourhood: "", city: "", region: "",
  postalCode: "", country: defaults?.country ?? "United States", latitude: "", longitude: "", bedrooms: "1",
  bathrooms: "1", floorArea: "", areaUnit: defaults?.areaUnit ?? "sq ft", furnished: "UNFURNISHED",
  amenities: [], utilities: [], availabilityDate: "", status: "DRAFT", featured: false,
  ownerName: "", ownerEmail: "", ownerPhone: "", displayOwnerContact: false,
  viewingInstructions: "", seoTitle: "", seoDescription: "", assignedToId: "", photos: [],
});

function listingToDraft(listing: ListingRow & Record<string, unknown>): ListingDraft {
  return {
    ...blankListing(),
    title: listing.title,
    slug: listing.slug,
    description: String(listing.description ?? ""),
    purpose: listing.purpose === "SALE" ? "SALE" : "RENT",
    propertyType: String(listing.propertyType ?? "Apartment"),
    price: String(listing.price),
    paymentPeriod: String(listing.paymentPeriod ?? "month"),
    address: String(listing.address ?? ""),
    neighbourhood: String(listing.neighbourhood ?? ""),
    city: listing.city,
    region: String(listing.region ?? ""),
    postalCode: String(listing.postalCode ?? ""),
    country: String(listing.country ?? "United States"),
    bathrooms: String(listing.bathrooms),
    floorArea: listing.floorArea == null ? "" : String(listing.floorArea),
    latitude: listing.latitude == null ? "" : String(listing.latitude),
    longitude: listing.longitude == null ? "" : String(listing.longitude),
    bedrooms: String(listing.bedrooms),
    areaUnit: String(listing.areaUnit ?? "sq ft"),
    furnished: String(listing.furnished ?? "UNFURNISHED"),
    amenities: Array.isArray(listing.amenities) ? listing.amenities as string[] : [],
    utilities: Array.isArray(listing.utilities) ? listing.utilities as string[] : [],
    availabilityDate: listing.availabilityDate ? new Date(String(listing.availabilityDate)).toISOString().slice(0, 10) : "",
    status: String(listing.status ?? "DRAFT"),
    featured: Boolean(listing.featured),
    ownerName: String(listing.ownerName ?? ""),
    ownerEmail: String(listing.ownerEmail ?? ""),
    ownerPhone: String(listing.ownerPhone ?? ""),
    displayOwnerContact: Boolean(listing.displayOwnerContact),
    viewingInstructions: String(listing.viewingInstructions ?? ""),
    seoTitle: String(listing.seoTitle ?? ""),
    seoDescription: String(listing.seoDescription ?? ""),
    assignedToId: String(listing.assignedToId ?? ""),
    photos: listing.photos.map((photo) => ({ ...photo, caption: photo.caption || "" })),
  };
}

function fieldPayload(draft: ListingDraft) {
  return {
    ...draft,
    price: Number(draft.price),
    bedrooms: Number(draft.bedrooms),
    bathrooms: Number(draft.bathrooms),
    floorArea: draft.floorArea || "",
    latitude: draft.latitude || "",
    longitude: draft.longitude || "",
  };
}

export function AdminWorkspace({ user, defaults }: { user: UserInfo; defaults: ListingDefaults }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const isOwner = user.role === "OWNER";

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <div className="admin-frame">
      <aside className="admin-sidebar">
        <Link href="/" className="brand-lockup admin-brand"><span className="brand-mark">A</span><span>Apex Stay</span></Link>
        <span className="sidebar-caption">Workspace</span>
        <nav aria-label="Dashboard navigation" className="admin-nav">
          {tabs.filter((item) => !item.owner || isOwner).map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => { setTab(item.id); setError(""); setNotice(""); }}><Icon size={17} />{item.label}</button>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-chip"><span className="avatar">{user.name.slice(0,1).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.role.toLowerCase()}</small></span></div>
          <button className="logout-button" onClick={logout}><LogOut size={16} /> Sign out</button>
          <Link href="/" className="public-site-link"><ArrowLeft size={14} /> View public website</Link>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar"><div><span className="eyebrow">Management workspace</span><h1>{tabs.find((item) => item.id === tab)?.label}</h1></div><div className="admin-topbar-user"><span className="online-dot" /> Private workspace</div></header>
        <div className="admin-content">
          {error && <div className="admin-alert error-alert" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss"><X size={15} /></button></div>}
          {notice && <div className="admin-alert success-alert" role="status"><Check size={16} />{notice}</div>}
          {tab === "overview" && <Overview user={user} refresh={refresh} onInbox={() => setTab("enquiries")} />}
          {tab === "listings" && <ListingsPanel user={user} defaults={defaults} onChange={() => setRefresh(refresh + 1)} onError={setError} onNotice={setNotice} />}
          {tab === "enquiries" && <EnquiriesPanel user={user} onError={setError} onNotice={setNotice} />}
          {tab === "content" && <ContentPanel onError={setError} onNotice={setNotice} />}
          {tab === "settings" && <SettingsPanel onError={setError} onNotice={setNotice} />}
          {tab === "team" && <TeamPanel onError={setError} onNotice={setNotice} />}
          {tab === "audit" && <AuditPanel refresh={refresh} />}
        </div>
      </main>
    </div>
  );
}

function Overview({ user, refresh, onInbox }: { user: UserInfo; refresh: number; onInbox: () => void }) {
  const [data, setData] = useState<{ listings: ListingRow[]; enquiries: EnquiryRow[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api<{ listings: ListingRow[] }>("/api/admin/listings"), api<{ enquiries: EnquiryRow[] }>("/api/admin/enquiries")])
      .then(([listings, enquiries]) => setData({ listings: listings.listings, enquiries: enquiries.enquiries }))
      .catch((failure) => setError(failure.message));
  }, [refresh]);
  const listings = data?.listings ?? [];
  const enquiries = data?.enquiries ?? [];
  const stats = [
    { label: "Available homes", value: listings.filter((item) => item.status === "AVAILABLE").length, note: "Visible on the public site" },
    { label: "Coming soon", value: listings.filter((item) => item.status === "COMING_SOON").length, note: "Preparing for publication" },
    { label: "Draft listings", value: listings.filter((item) => item.status === "DRAFT").length, note: "Only visible to your team" },
    { label: "New enquiries", value: enquiries.filter((item) => item.status === "NEW").length, note: "Awaiting a response" },
  ];
  return <>
    <div className="dashboard-welcome"><div><span className="eyebrow">Good to see you, {user.name.split(" ")[0]}</span><h2>Your business, at a glance.</h2><p>Here’s what’s happening across your properties and enquiries.</p></div><ShieldCheck size={30} /></div>
    {error ? <div className="panel-error">{error}</div> : !data ? <div className="panel-loading">Loading your business data…</div> : <>
      <div className="stats-grid">{stats.map((stat) => <article className="stat-card" key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.note}</small></article>)}</div>
      <div className="dashboard-columns"><section className="admin-panel"><div className="panel-heading"><div><span className="eyebrow">Recent activity</span><h3>Latest enquiries</h3></div><button className="small-link" onClick={onInbox}>View inbox <ArrowRight size={14} /></button></div>{enquiries.length ? enquiries.slice(0,5).map((item) => <div className="activity-row" key={item.id}><span className="activity-dot" /><div><strong>{item.name}</strong><p>{item.listing?.title || "General enquiry"}</p></div><span className={`status-pill status-${item.status.toLowerCase()}`}>{item.status.toLowerCase()}</span></div>) : <p className="muted empty-panel-text">Enquiries will appear here when visitors contact your team.</p>}</section>
      <section className="admin-panel"><div className="panel-heading"><div><span className="eyebrow">Your collection</span><h3>Recently updated listings</h3></div><span className="total-mini">{listings.length} total</span></div>{listings.length ? listings.slice(0,5).map((item) => <div className="listing-admin-row" key={item.id}><div><strong>{item.title}</strong><small>{item.city}</small></div><span className={`status-pill status-${item.status.toLowerCase()}`}>{item.status.replace("_"," ").toLowerCase()}</span></div>) : <p className="muted empty-panel-text">Add your first apartment to get started.</p>}</section></div>
    </>}
  </>;
}

function ListingsPanel({ user, defaults, onChange, onError, onNotice }: { user: UserInfo; defaults: ListingDefaults; onChange: () => void; onError: (s: string) => void; onNotice: (s: string) => void }) {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [users, setUsers] = useState<StaffRow[]>([]);
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<ListingDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ previewId: string | null; preview: CsvRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      if (query) params.set("q", query);
      const result = await api<{ listings: ListingRow[] }>(`/api/admin/listings?${params}`);
      setListings(result.listings);
      if (user.role !== "AGENT") {
        const people = await api<{ users: StaffRow[] }>("/api/admin/users").catch(() => ({ users: [] }));
        setUsers(people.users);
      }
    } catch (failure) { onError((failure as Error).message); }
    finally { setLoading(false); }
  }, [filter, query, user.role, onError]);
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    if (query) params.set("q", query);
    api<{ listings: ListingRow[] }>(`/api/admin/listings?${params}`)
      .then(async (result) => {
        if (active) setListings(result.listings);
        if (user.role !== "AGENT") {
          const people = await api<{ users: StaffRow[] }>("/api/admin/users").catch(() => ({ users: [] }));
          if (active) setUsers(people.users);
        }
      })
      .catch((failure) => { if (active) onError((failure as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter, query, user.role, onError]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    setBusy(true);
    onError("");
    try {
      const body = fieldPayload(editor);
      await api(editingId ? `/api/admin/listings/${editingId}` : "/api/admin/listings", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setEditor(null);
      setEditingId(null);
      onNotice(editingId ? "Listing changes saved." : "Listing created.");
      onChange();
      await load();
    } catch (failure) { onError((failure as Error).message); }
    finally { setBusy(false); }
  }
  async function changeStatus(listing: ListingRow, status: string) {
    try {
      await api(`/api/admin/listings/${listing.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      onNotice(`Listing ${status === "AVAILABLE" ? "published" : status === "DRAFT" ? "unpublished" : "archived"}.`);
      await load();
      onChange();
    } catch (failure) { onError((failure as Error).message); }
  }
  async function removeListing(listing: ListingRow) {
    if (!window.confirm(`Delete “${listing.title}”? This permanently removes the listing and its enquiry references.`)) return;
    try {
      await api(`/api/admin/listings/${listing.id}`, { method: "DELETE" });
      onNotice("Listing deleted.");
      await load();
      onChange();
    } catch (failure) { onError((failure as Error).message); }
  }
  async function downloadCsv() {
    try {
      const response = await fetch("/api/admin/listings/csv");
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(typeof result.error === "string" ? result.error : "CSV export failed.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "apex-stay-listings.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (failure) { onError((failure as Error).message); }
  }
  async function previewCsv(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCsvBusy(true);
    setCsvPreview(null);
    try {
      const result = await api<{ previewId: string | null; preview: CsvRow[] }>("/api/admin/listings/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: await file.text() }),
      });
      setCsvPreview(result);
    } catch (failure) { onError((failure as Error).message); }
    finally { setCsvBusy(false); }
  }
  async function importCsv() {
    if (!csvPreview?.previewId) return;
    setCsvBusy(true);
    try {
      const result = await api<{ imported: number }>("/api/admin/listings/csv/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId: csvPreview.previewId }),
      });
      setCsvPreview(null);
      setCsvOpen(false);
      onNotice(`${result.imported} listing${result.imported === 1 ? "" : "s"} imported.`);
      onChange();
      await load();
    } catch (failure) { onError((failure as Error).message); }
    finally { setCsvBusy(false); }
  }
  return <>
    <div className="list-toolbar"><div><span className="eyebrow">Property portfolio</span><p>Manage publication, details, photos, and team assignment.</p></div><div className="listing-toolbar-actions"><button className="button button-light" onClick={() => { setCsvOpen(true); setCsvPreview(null); }}><FileDown size={15}/> CSV import / export</button><button className="button button-dark" onClick={() => { setEditingId(null); setEditor(blankListing(defaults)); }}><Plus size={16} /> Add listing</button></div></div>
    <div className="table-controls"><form onSubmit={(event) => { event.preventDefault(); setQuery(new FormData(event.currentTarget).get("q")?.toString() || ""); }}><input name="q" placeholder="Search title, city, URL…" /><button className="button button-light">Search</button></form><select aria-label="Filter by listing status" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">All statuses</option>{["DRAFT","AVAILABLE","COMING_SOON","RENTED_SOLD","ARCHIVED"].map((status) => <option key={status} value={status}>{status.replace("_"," ")}</option>)}</select></div>
    <div className="table-wrap"><table className="admin-table"><thead><tr><th>Apartment</th><th>Price</th><th>Status</th><th>Assigned to</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="table-empty">Loading listings…</td></tr> : listings.length ? listings.map((listing) => <tr key={listing.id}><td><strong>{listing.title}</strong><small>{listing.city} · /apartments/{listing.slug}</small></td>    <td>{money(Number(listing.price), listing.currency)}<small>{listing.purpose === "RENT" ? `per ${listing.paymentPeriod}` : "asking"}</small></td><td><span className={`status-pill status-${listing.status.toLowerCase()}`}>{listing.status.replace("_"," ").toLowerCase()}</span></td><td>{listing.assignedTo?.name || "Unassigned"}</td><td>{new Date(listing.updatedAt).toLocaleDateString()}</td><td><div className="row-actions"><button onClick={() => { void api<{listing: ListingRow & Record<string,unknown>}>(`/api/admin/listings/${listing.id}`).then(({listing:detail})=>{setEditingId(listing.id);setEditor(listingToDraft(detail))}).catch((failure)=>onError((failure as Error).message)); }}>Edit</button>{listing.status === "DRAFT" ? <button onClick={() => void changeStatus(listing,"AVAILABLE")}>Publish</button> : listing.status === "AVAILABLE" ? <button onClick={() => void changeStatus(listing, "DRAFT")}>Unpublish</button> : null}{listing.status !== "ARCHIVED" && <button onClick={() => void changeStatus(listing, "ARCHIVED")}>Archive</button>}{user.role !== "AGENT" && <button className="danger-text" onClick={() => void removeListing(listing)} aria-label={`Delete ${listing.title}`}><Trash2 size={14} /></button>}<Link href={`/admin/listings/${listing.id}/preview`}>Preview</Link>{["AVAILABLE","COMING_SOON"].includes(listing.status) && <Link target="_blank" href={`/apartments/${listing.slug}`}>View live</Link>}</div></td></tr>) : <tr><td colSpan={6} className="table-empty">No listings match your filters. Create an apartment to get started.</td></tr>}</tbody></table></div>
    {editor && <ListingEditor value={editor} setValue={setEditor} users={users} busy={busy} editing={Boolean(editingId)} onClose={() => { setEditor(null); setEditingId(null); }} onSubmit={save} onError={onError} />}
    {csvOpen && <div className="modal-backdrop" role="presentation"><section className="csv-modal" role="dialog" aria-modal="true" aria-labelledby="csv-title"><header><div><span className="eyebrow">Spreadsheet tools</span><h2 id="csv-title">Import or export listings</h2></div><button className="icon-button" onClick={() => setCsvOpen(false)} aria-label="Close CSV tools"><X/></button></header><div className="csv-modal-content"><p>Export the current records as CSV, or upload a CSV to validate every row before importing. Images must be added separately in the listing editor.</p><button className="button button-light" onClick={()=>void downloadCsv()}><FileDown size={15}/>Download CSV / template</button><label className="csv-upload">Choose CSV file<input type="file" accept=".csv,text/csv" onChange={previewCsv}/></label>{csvBusy&&<p className="panel-loading">Checking or importing records…</p>}{csvPreview&&<><div className={`csv-result ${csvPreview.previewId?"":"has-errors"}`}><strong>{csvPreview.previewId?"All rows passed validation.":"Resolve the row errors before importing."}</strong><span>{csvPreview.preview.length} row(s) reviewed. The preview expires after 15 minutes.</span></div><div className="table-wrap csv-preview-table"><table className="admin-table"><thead><tr><th>CSV row</th><th>Listing</th><th>Location</th><th>Purpose</th><th>Status</th><th>Validation</th></tr></thead><tbody>{csvPreview.preview.slice(0,50).map((row)=><tr key={`${row.row}-${row.slug}`}><td>{row.row}</td><td><strong>{row.title||"Untitled"}</strong><small>{row.slug}</small></td><td>{row.city}</td><td>{row.purpose}</td><td>{row.status}</td><td className={row.errors.length?"csv-errors":"csv-valid"}>{row.errors.length?row.errors.join("; "):"Ready"}</td></tr>)}</tbody></table></div>{csvPreview.preview.length>50&&<p className="field-hint">Showing the first 50 rows in the preview; all {csvPreview.preview.length} rows are validated.</p>}<div className="editor-footer"><button className="button button-light" onClick={()=>setCsvPreview(null)}>Choose another file</button><button className="button button-dark" disabled={!csvPreview.previewId||csvBusy} onClick={()=>void importCsv()}>Import {csvPreview.preview.length} listing(s)</button></div></>}</div></section></div>}
  </>;
}

function ListingEditor({ value, setValue, users, busy, editing, onClose, onSubmit, onError }: {
  value: ListingDraft; setValue: (value: ListingDraft) => void; users: StaffRow[]; busy: boolean;
  editing: boolean; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onError: (message: string) => void;
}) {
  const update = <K extends keyof ListingDraft>(key: K, next: ListingDraft[K]) => setValue({ ...value, [key]: next });
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    try {
      const result = await api<{ url: string }>("/api/admin/upload", { method: "POST", body: form });
      const photo: Photo = { url: result.url, altText: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "), caption: "", cover: value.photos.length === 0, position: value.photos.length };
      update("photos", [...value.photos, photo]);
      onError("");
    } catch (failure) { onError((failure as Error).message); }
    event.target.value = "";
  }
  function updatePhoto(index: number, patch: Partial<Photo>) {
    update("photos", value.photos.map((photo, i) => ({ ...photo, ...(i === index ? patch : {}) })));
  }
  function movePhoto(index: number, direction: -1 | 1) {
    const next = [...value.photos];
    const destination = index + direction;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    update("photos", next.map((photo, position) => ({ ...photo, position })));
  }
  return <div className="modal-backdrop" role="presentation"><section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="listing-editor-title"><header><div><span className="eyebrow">{editing ? "Update property details" : "Add to your collection"}</span><h2 id="listing-editor-title">{editing ? "Edit apartment" : "New apartment listing"}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close editor"><X /></button></header>
    <form onSubmit={onSubmit} className="listing-editor-form">
      <fieldset><legend>Listing basics</legend><div className="form-grid"><label className="span-two">Title<input required minLength={4} maxLength={160} value={value.title} onChange={(event) => { const title=event.target.value; setValue({ ...value, title, slug: value.slug || title.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") }); }} /></label><label>Shareable URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={value.slug} onChange={(event) => update("slug", event.target.value)} /></label><label>Listing purpose<select value={value.purpose} onChange={(event) => update("purpose", event.target.value as "RENT"|"SALE")}><option value="RENT">For rent</option><option value="SALE">For sale</option></select></label><label>Property type<input required value={value.propertyType} onChange={(event) => update("propertyType", event.target.value)} /></label><label>Price<input required type="number" min="1" step="0.01" value={value.price} onChange={(event) => update("price", event.target.value)} /></label><label>Payment period<select value={value.paymentPeriod} onChange={(event) => update("paymentPeriod", event.target.value)}><option value="month">Monthly</option><option value="week">Weekly</option><option value="year">Yearly</option><option value="one-time">One-time</option></select></label><label>Status<select value={value.status} onChange={(event) => update("status", event.target.value)}>{["DRAFT","AVAILABLE","COMING_SOON","RENTED_SOLD","ARCHIVED"].map((status)=><option key={status} value={status}>{status.replace("_"," ")}</option>)}</select></label><label className="span-two">Description<textarea required minLength={30} rows={5} value={value.description} onChange={(event) => update("description", event.target.value)} /></label></div></fieldset>
      <fieldset><legend>Location</legend><div className="form-grid"><label className="span-two">Street address<input required value={value.address} onChange={(event) => update("address", event.target.value)} /></label><label>Neighbourhood<input value={value.neighbourhood} onChange={(event) => update("neighbourhood", event.target.value)} /></label><label>City<input required value={value.city} onChange={(event) => update("city", event.target.value)} /></label><label>State / region<input required value={value.region} onChange={(event) => update("region", event.target.value)} /></label><label>ZIP code<input value={value.postalCode} onChange={(event) => update("postalCode", event.target.value)} /></label><label>Country<input required value={value.country} onChange={(event) => update("country", event.target.value)} /></label><label>Latitude (optional)<input type="number" step="any" value={value.latitude} onChange={(event) => update("latitude", event.target.value)} /></label><label>Longitude (optional)<input type="number" step="any" value={value.longitude} onChange={(event) => update("longitude", event.target.value)} /></label></div></fieldset>
      <fieldset><legend>Details & availability</legend><div className="form-grid"><label>Bedrooms<input type="number" min="0" max="30" value={value.bedrooms} onChange={(event) => update("bedrooms", event.target.value)} /></label><label>Bathrooms<input type="number" min="0" max="30" step="0.5" value={value.bathrooms} onChange={(event) => update("bathrooms", event.target.value)} /></label><label>Floor area<input type="number" min="0" value={value.floorArea} onChange={(event) => update("floorArea", event.target.value)} /></label><label>Area unit<select value={value.areaUnit} onChange={(event) => update("areaUnit", event.target.value)}><option>sq ft</option><option>sq m</option></select></label><label>Furnishing<select value={value.furnished} onChange={(event) => update("furnished", event.target.value)}><option value="UNFURNISHED">Unfurnished</option><option value="FURNISHED">Furnished</option><option value="PARTIALLY_FURNISHED">Partly furnished</option></select></label><label>Availability date<input type="date" value={value.availabilityDate} onChange={(event) => update("availabilityDate", event.target.value)} /></label><label className="check-control"><input type="checkbox" checked={value.featured} onChange={(event) => update("featured", event.target.checked)} /> Feature on homepage</label><label className="check-control"><input type="checkbox" checked={value.displayOwnerContact} onChange={(event) => update("displayOwnerContact", event.target.checked)} /> Allow owner contact details</label></div><p className="field-hint">Contact details appear publicly only if both this listing and your business settings allow it.</p><div className="chip-checkboxes">{amenityOptions.map((amenity) => <label key={amenity}><input type="checkbox" checked={value.amenities.includes(amenity)} onChange={(event) => update("amenities", event.target.checked ? [...value.amenities,amenity] : value.amenities.filter((item)=>item!==amenity))} />{amenity}</label>)}</div><strong className="field-hint">Utilities included</strong><div className="chip-checkboxes">{utilityOptions.map((item)=><label key={item}><input type="checkbox" checked={value.utilities.includes(item)} onChange={(event)=>update("utilities",event.target.checked?[...value.utilities,item]:value.utilities.filter((utility)=>utility!==item))}/>{item}</label>)}</div></fieldset>
      <fieldset><legend>Property photos</legend><p className="field-hint">JPEG, PNG, WebP, or AVIF · up to 4 MB per image. An image-storage provider must be configured.</p><label className="upload-control">Choose image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={upload} /></label>{value.photos.length === 0 && <p className="photo-empty-note">No images uploaded. Listings can still be saved as drafts; published homes are more useful with photos.</p>}<div className="photo-editor-list">{value.photos.map((photo,index)=><div className="photo-editor-row" key={`${photo.url}-${index}`}><Image src={photo.url} alt="" width={106} height={85} unoptimized /><div className="photo-editor-fields"><label>Alt text<input required minLength={3} value={photo.altText} onChange={(event)=>updatePhoto(index,{altText:event.target.value})} /></label><label>Caption<input value={photo.caption} onChange={(event)=>updatePhoto(index,{caption:event.target.value})} /></label><label className="check-control"><input type="radio" name="cover" checked={photo.cover} onChange={()=>update("photos",value.photos.map((item,i)=>({...item,cover:i===index})))} /> Cover image</label></div><div className="photo-actions"><button type="button" aria-label="Move photo up" onClick={()=>movePhoto(index,-1)}><ArrowUp size={14}/></button><button type="button" aria-label="Move photo down" onClick={()=>movePhoto(index,1)}><ArrowDown size={14}/></button><button type="button" aria-label="Remove photo" onClick={()=>update("photos",value.photos.filter((_,i)=>i!==index).map((item,i)=>({...item,position:i,cover:i===0?true:item.cover})))}><Trash2 size={14}/></button></div></div>)}</div></fieldset>
      <fieldset><legend>Contact & team</legend><div className="form-grid"><label>Owner / agent name<input value={value.ownerName} onChange={(event)=>update("ownerName",event.target.value)} /></label><label>Owner / agent email<input type="email" value={value.ownerEmail} onChange={(event)=>update("ownerEmail",event.target.value)} /></label><label>Owner / agent phone<input value={value.ownerPhone} onChange={(event)=>update("ownerPhone",event.target.value)} /></label><label>Assign to<select value={value.assignedToId} onChange={(event)=>update("assignedToId",event.target.value)}><option value="">Unassigned</option>{users.filter((item)=>item.active&&item.role!=="OWNER").map((item)=><option key={item.id} value={item.id}>{item.name} · {item.role.toLowerCase()}</option>)}</select></label><label className="span-two">Viewing instructions<textarea rows={2} value={value.viewingInstructions} onChange={(event)=>update("viewingInstructions",event.target.value)} /></label></div></fieldset>
      <fieldset><legend>Search engine details</legend><div className="form-grid"><label>SEO title<input maxLength={160} value={value.seoTitle} onChange={(event)=>update("seoTitle",event.target.value)} /></label><label>SEO description<input maxLength={320} value={value.seoDescription} onChange={(event)=>update("seoDescription",event.target.value)} /></label></div></fieldset>
      <div className="editor-footer"><button className="button button-light" type="button" onClick={onClose}>Cancel</button><button className="button button-dark" disabled={busy}><Save size={15}/>{busy?"Saving…":editing?"Save changes":"Create listing"}</button></div>
    </form></section></div>;
}

function EnquiriesPanel({ user, onError, onNotice }: { user: UserInfo; onError: (s:string)=>void; onNotice:(s:string)=>void }) {
  const [items,setItems]=useState<EnquiryRow[]>([]);
  const [staff,setStaff]=useState<{id:string;name:string;role:Role}[]>([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState("");
  const [selected,setSelected]=useState<string|null>(null);
  const [notes,setNotes]=useState("");
  const load=useCallback(async()=>{try{const response=await api<{enquiries:EnquiryRow[]}>(`/api/admin/enquiries${filter?`?status=${filter}`:""}`);setItems(response.enquiries)}catch(failure){onError((failure as Error).message)}finally{setLoading(false)}},[filter,onError]);
  useEffect(()=>{
    let active=true;
    api<{enquiries:EnquiryRow[]}>(`/api/admin/enquiries${filter?`?status=${filter}`:""}`)
      .then((response)=>{if(active)setItems(response.enquiries)})
      .catch((failure)=>{if(active)onError((failure as Error).message)})
      .finally(()=>{if(active)setLoading(false)});
    return ()=>{active=false};
  },[filter,onError]);
  useEffect(()=>{
    if(user.role==="AGENT")return;
    api<{users:{id:string;name:string;role:Role}[]}>("/api/admin/assignees")
      .then(({users})=>setStaff(users))
      .catch((failure)=>onError((failure as Error).message));
  },[user.role,onError]);
  const current=items.find((item)=>item.id===selected);
  async function update(id:string, body:Record<string,unknown>){try{await api(`/api/admin/enquiries/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});onNotice("Enquiry updated.");await load()}catch(failure){onError((failure as Error).message)}}
  return <><div className="list-toolbar"><div><span className="eyebrow">Your team’s inbox</span><p>Keep track of visitor questions and property follow-ups.</p></div><select className="status-filter" value={filter} onChange={(event)=>setFilter(event.target.value)}><option value="">All enquiries</option>{["NEW","CONTACTED","VIEWING","CLOSED","SPAM"].map((status)=><option key={status} value={status}>{status.toLowerCase()}</option>)}</select></div>
    {loading?<div className="panel-loading">Loading enquiries…</div>:!items.length?<div className="result-message admin-empty"><Inbox size={32}/><h3>No enquiries here yet.</h3><p>Messages submitted from apartment pages will appear in this inbox.</p></div>:<div className="inbox-layout"><div className="inbox-list">{items.map((item)=><button key={item.id} className={`inbox-item ${selected===item.id?"selected":""}`} onClick={()=>{setSelected(item.id);setNotes(item.notes||"")}}><span className={`status-dot status-${item.status.toLowerCase()}`}/><div><strong>{item.name}</strong><small>{item.listing?.title||"General question"}</small><span>{new Date(item.createdAt).toLocaleDateString()}</span></div><ChevronDown size={15}/></button>)}</div>{current&&<article className="enquiry-detail"><div className="enquiry-detail-head"><div><span className="eyebrow">Message from {current.name}</span><h3>{current.listing?.title||"General enquiry"}</h3><p>{new Date(current.createdAt).toLocaleString()}</p></div><select aria-label="Enquiry status" value={current.status} onChange={(event)=>void update(current.id,{status:event.target.value})}>{["NEW","CONTACTED","VIEWING","CLOSED","SPAM"].map((status)=><option key={status} value={status}>{status.toLowerCase()}</option>)}</select></div><div className="enquiry-contact"><a href={`mailto:${current.email}`}>{current.email}</a>{current.phone&&<a href={`tel:${current.phone}`}>{current.phone}</a>}</div><p className="enquiry-message">{current.message}</p><label>Internal notes<textarea rows={4} maxLength={4000} value={notes} onChange={(event)=>setNotes(event.target.value)} onBlur={()=>notes!==current.notes&&void update(current.id,{notes})} placeholder="Only your team can see these notes." /></label>{user.role!=="AGENT"&&<label className="assign-enquiry">Assign to<select value={current.assignedTo?.id||""} onChange={(event)=>void update(current.id,{assignedToId:event.target.value||null})}><option value="">Unassigned</option>{staff.map((member)=><option key={member.id} value={member.id}>{member.name} · {member.role.toLowerCase()}</option>)}</select></label>}</article>}</div>}</>;
}

function SettingsPanel({onError,onNotice}:{onError:(s:string)=>void;onNotice:(s:string)=>void}) {
  const [settings,setSettings]=useState<SiteSettings>(defaultSettings);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [navigation,setNavigation]=useState("");
  const [footerLinks,setFooterLinks]=useState("");
  useEffect(()=>{api<{settings:SiteSettings}>("/api/admin/settings").then(({settings:loaded})=>{setSettings(loaded);setNavigation(JSON.stringify(loaded.brand.navigation,null,2));setFooterLinks(JSON.stringify(loaded.brand.footerLinks,null,2))}).catch((failure)=>onError((failure as Error).message)).finally(()=>setLoading(false))},[onError]);
  function brand<K extends keyof SiteSettings["brand"]>(key:K,value:SiteSettings["brand"][K]){setSettings((current)=>({...current,brand:{...current.brand,[key]:value}}))}
  function business<K extends keyof SiteSettings["business"]>(key:K,value:SiteSettings["business"][K]){setSettings((current)=>({...current,business:{...current.business,[key]:value}}))}
  function home<K extends keyof SiteSettings["home"]>(key:K,value:SiteSettings["home"][K]){setSettings((current)=>({...current,home:{...current.home,[key]:value}}))}
  function seo<K extends keyof SiteSettings["seo"]>(key:K,value:SiteSettings["seo"][K]){setSettings((current)=>({...current,seo:{...current.seo,[key]:value}}))}
  async function save(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setSaving(true);try{const full={...settings,brand:{...settings.brand,navigation:JSON.parse(navigation),footerLinks:JSON.parse(footerLinks)}};await api("/api/admin/settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(full)});onNotice("Brand and business settings saved. Changes are live on the public website.");}catch(failure){onError((failure as Error).message)}finally{setSaving(false)}}
  if(loading)return <div className="panel-loading">Loading business settings…</div>;
  return <form className="settings-form" onSubmit={save}><div className="list-toolbar"><div><span className="eyebrow">Your business identity</span><p>These settings update your public-facing website.</p></div><button className="button button-dark" disabled={saving}><Save size={15}/>{saving?"Saving…":"Save settings"}</button></div>
    <fieldset><legend>Brand identity</legend><div className="form-grid"><label>Business name<input required value={settings.brand.name} onChange={(event)=>brand("name",event.target.value)}/></label><label>Tagline<input value={settings.brand.tagline} onChange={(event)=>brand("tagline",event.target.value)}/></label><label>Logo image URL<input type="url" value={settings.brand.logoUrl} onChange={(event)=>brand("logoUrl",event.target.value)}/></label><label>Favicon URL<input type="url" value={settings.brand.faviconUrl} onChange={(event)=>brand("faviconUrl",event.target.value)}/></label><label>Primary colour<input type="color" value={settings.brand.primaryColor} onChange={(event)=>brand("primaryColor",event.target.value)}/></label><label>Accent colour<input type="color" value={settings.brand.accentColor} onChange={(event)=>brand("accentColor",event.target.value)}/></label><label>Typography<select value={settings.brand.typography} onChange={(event)=>brand("typography",event.target.value as "serif"|"sans")}><option value="serif">Editorial serif</option><option value="sans">Clean sans-serif</option></select></label><label>Footer message<input value={settings.brand.footerText} onChange={(event)=>brand("footerText",event.target.value)}/></label></div></fieldset>
    <fieldset><legend>Contact & social links</legend><div className="form-grid"><label>Business email<input type="email" value={settings.brand.contactEmail} onChange={(event)=>brand("contactEmail",event.target.value)}/></label><label>Business phone<input value={settings.brand.contactPhone} onChange={(event)=>brand("contactPhone",event.target.value)}/></label><label className="span-two">Business address<input value={settings.brand.address} onChange={(event)=>brand("address",event.target.value)}/></label>{(["instagram","facebook","linkedin"] as const).map((key)=><label key={key}>{key[0].toUpperCase()+key.slice(1)} URL<input type="url" value={settings.brand.socialLinks[key]} onChange={(event)=>brand("socialLinks",{...settings.brand.socialLinks,[key]:event.target.value})}/></label>)}</div></fieldset>
    <fieldset><legend>Business preferences</legend><div className="form-grid"><label>Country<input required value={settings.business.country} onChange={(event)=>business("country",event.target.value)}/></label><label>Currency (ISO code)<input required maxLength={3} value={settings.business.currency} onChange={(event)=>business("currency",event.target.value.toUpperCase())}/></label><label>Price display<select value={settings.business.priceFormat} onChange={(event)=>business("priceFormat",event.target.value as "whole"|"precise")}><option value="whole">Whole currency units</option><option value="precise">Show up to 2 decimal places</option></select></label><label>Default payment period<select value={settings.business.paymentPeriod} onChange={(event)=>business("paymentPeriod",event.target.value as SiteSettings["business"]["paymentPeriod"])}><option value="month">Monthly</option><option value="week">Weekly</option><option value="year">Yearly</option><option value="one-time">One-time</option></select></label><label>Floor area unit<select value={settings.business.areaUnit} onChange={(event)=>business("areaUnit",event.target.value as "sq ft"|"sq m")}><option>sq ft</option><option>sq m</option></select></label><label>Date format<select value={settings.business.dateFormat} onChange={(event)=>business("dateFormat",event.target.value as SiteSettings["business"]["dateFormat"])}><option>MM/DD/YYYY</option><option>DD/MM/YYYY</option><option>YYYY-MM-DD</option></select></label><label>Contact preference<select value={settings.business.contactPreference} onChange={(event)=>business("contactPreference",event.target.value as SiteSettings["business"]["contactPreference"])}><option value="email">Email</option><option value="phone">Phone</option><option value="either">Either</option></select></label></div><div className="purpose-options"><strong>Listing purposes enabled</strong>{(["RENT","SALE"] as const).map((item)=><label key={item}><input type="checkbox" checked={settings.business.purposes.includes(item)} onChange={(event)=>business("purposes",event.target.checked?[...settings.business.purposes,item]:settings.business.purposes.filter((purpose)=>purpose!==item))}/>{item==="RENT"?"Rentals":"Properties for sale"}</label>)}</div><label className="check-control"><input type="checkbox" checked={settings.business.showOwnerContact} onChange={(event)=>business("showOwnerContact",event.target.checked)}/> Allow owner / agent contact details to show when enabled for an individual listing</label></fieldset>
    <fieldset><legend>Homepage content & search appearance</legend><div className="form-grid"><label>Homepage eyebrow<input value={settings.home.eyebrow} onChange={(event)=>home("eyebrow",event.target.value)}/></label><label>Homepage headline<input value={settings.home.headline} onChange={(event)=>home("headline",event.target.value)}/></label><label className="span-two">Homepage introduction<textarea rows={3} value={settings.home.description} onChange={(event)=>home("description",event.target.value)}/></label><label>Hero image URL<input type="url" value={settings.home.heroImage} onChange={(event)=>home("heroImage",event.target.value)}/></label><label>Homepage story heading<input value={settings.home.aboutTitle} onChange={(event)=>home("aboutTitle",event.target.value)}/></label><label className="span-two">Homepage story copy<textarea rows={3} value={settings.home.aboutBody} onChange={(event)=>home("aboutBody",event.target.value)}/></label></div></fieldset>
    <fieldset><legend>Navigation, footer links & SEO</legend><div className="form-grid"><label className="span-two">Navigation links (JSON array of label and internal href)<textarea rows={5} value={navigation} onChange={(event)=>setNavigation(event.target.value)}/></label><label className="span-two">Footer links (JSON array of label and internal href)<textarea rows={5} value={footerLinks} onChange={(event)=>setFooterLinks(event.target.value)}/></label><label>Default SEO title<input value={settings.seo.title} onChange={(event)=>seo("title",event.target.value)}/></label><label>Default meta description<input value={settings.seo.description} onChange={(event)=>seo("description",event.target.value)}/></label><label className="span-two">Social-sharing image URL<input type="url" value={settings.seo.socialImage} onChange={(event)=>seo("socialImage",event.target.value)} /></label></div></fieldset>
  </form>;
}

function ContentPanel({onError,onNotice}:{onError:(s:string)=>void;onNotice:(s:string)=>void}) {
  const [pages,setPages]=useState<SitePage[]>(defaultPages.map((item)=>({...item,metaTitle:"",metaDescription:"",published:true})));
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState<string|null>(null);
  useEffect(()=>{api<{pages:SitePage[]}>("/api/admin/pages").then(({pages:stored})=>setPages((current)=>current.map((page)=>stored.find((item)=>item.slug===page.slug)||page))).catch((failure)=>onError((failure as Error).message)).finally(()=>setLoading(false))},[onError]);
  function update(slug:string,key:keyof SitePage,value:string|boolean){setPages((current)=>current.map((page)=>page.slug===slug?{...page,[key]:value}:page))}
  async function save(page:SitePage){setSaving(page.slug);try{await api("/api/admin/pages",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(page)});onNotice(`${page.title} page saved.`)}catch(failure){onError((failure as Error).message)}finally{setSaving(null)}}
  return <><div className="list-toolbar"><div><span className="eyebrow">Public information</span><p>Edit your About, Contact, FAQ, Privacy, and Terms pages.</p></div></div>{loading?<div className="panel-loading">Loading content…</div>:<div className="content-editor-grid">{pages.map((page)=><form key={page.slug} className="content-editor-card" onSubmit={(event)=>{event.preventDefault();void save(page)}}><div className="content-editor-head"><div><span className="eyebrow">/{page.slug}</span><h3>{page.title}</h3></div><label className="check-control"><input type="checkbox" checked={page.published} onChange={(event)=>update(page.slug,"published",event.target.checked)}/> Published</label></div><label>Page heading<input required value={page.title} onChange={(event)=>update(page.slug,"title",event.target.value)}/></label><label>Page text<textarea rows={7} value={page.body} onChange={(event)=>update(page.slug,"body",event.target.value)}/></label><label>SEO title<input value={page.metaTitle||""} onChange={(event)=>update(page.slug,"metaTitle",event.target.value)}/></label><label>Meta description<input value={page.metaDescription||""} onChange={(event)=>update(page.slug,"metaDescription",event.target.value)}/></label><button className="button button-light" disabled={saving===page.slug}><Save size={14}/>{saving===page.slug?"Saving…":"Save page"}</button></form>)}</div>}</>;
}

function TeamPanel({onError,onNotice}:{onError:(s:string)=>void;onNotice:(s:string)=>void}) {
  const [users,setUsers]=useState<StaffRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [creating,setCreating]=useState(false);
  const [busy,setBusy]=useState(false);
  const load=useCallback(()=>api<{users:StaffRow[]}>("/api/admin/users").then(({users})=>setUsers(users)).catch((failure)=>onError((failure as Error).message)).finally(()=>setLoading(false)),[onError]);
  useEffect(()=>{void load()},[load]);
  async function create(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);const body=Object.fromEntries(new FormData(event.currentTarget));try{await api("/api/admin/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});event.currentTarget.reset();setCreating(false);onNotice("Staff account created.");await load()}catch(failure){onError((failure as Error).message)}finally{setBusy(false)}}
  async function setActive(user:StaffRow){try{await api(`/api/admin/users/${user.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({active:!user.active})});onNotice(user.active?"Account deactivated.":"Account activated.");await load()}catch(failure){onError((failure as Error).message)}}
  async function deleteUser(user:StaffRow){if(!window.confirm(`Remove ${user.name} from this business?`))return;try{await api(`/api/admin/users/${user.id}`,{method:"DELETE"});onNotice("Staff account removed.");await load()}catch(failure){onError((failure as Error).message)}}
  return <><div className="list-toolbar"><div><span className="eyebrow">Role-based access</span><p>Managers manage listings and enquiries. Agents see only work assigned to them.</p></div><button className="button button-dark" onClick={()=>setCreating(!creating)}><Plus size={15}/>Add staff member</button></div>
    {creating&&<form className="new-user-form" onSubmit={create}><h3>Create staff account</h3><div className="form-grid"><label>Full name<input name="name" required minLength={2} maxLength={100}/></label><label>Email<input name="email" type="email" required maxLength={254}/></label><label>Password (12+ characters)<input name="password" type="password" required minLength={12} maxLength={128}/></label><label>Role<select name="role"><option value="AGENT">Agent / Staff</option><option value="MANAGER">Manager</option></select></label></div><div className="editor-footer"><button type="button" className="button button-light" onClick={()=>setCreating(false)}>Cancel</button><button className="button button-dark" disabled={busy}>{busy?"Creating…":"Create account"}</button></div></form>}
    <div className="table-wrap"><table className="admin-table"><thead><tr><th>Team member</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{loading?<tr><td colSpan={5} className="table-empty">Loading accounts…</td></tr>:users.map((member)=><tr key={member.id}><td><strong>{member.name}</strong><small>{member.email}</small></td><td>{member.role.toLowerCase()}</td><td><span className={`status-pill status-${member.active?"available":"archived"}`}>{member.active?"active":"inactive"}</span></td><td>{new Date(member.createdAt).toLocaleDateString()}</td><td><div className="row-actions"><button onClick={()=>void setActive(member)}>{member.active?"Deactivate":"Activate"}</button>{member.role!=="OWNER"&&<button className="danger-text" onClick={()=>void deleteUser(member)}><Trash2 size={14}/> Remove</button>}</div></td></tr>)}</tbody></table></div>
    <div className="role-explainer"><h3>Account safety</h3><p>Only the owner can create or deactivate accounts and change business settings. Manager and Agent accounts cannot access ownership controls.</p><p>Passwords are stored as salted hashes. Sessions use secure, HTTP-only cookies and expire after 12 hours.</p></div>
  </>;
}

function AuditPanel({refresh}:{refresh:number}) {
  const [events,setEvents]=useState<{id:string;action:string;entity:string;entityId:string|null;createdAt:string;actor:{name:string;email:string}|null}[]>([]);
  const [error,setError]=useState("");
  useEffect(()=>{api<{events:typeof events}>("/api/admin/audit").then(({events})=>setEvents(events)).catch((failure)=>setError((failure as Error).message))},[refresh]);
  return <><div className="list-toolbar"><div><span className="eyebrow">Accountability</span><p>Recent sensitive actions on this installation.</p></div></div>{error?<div className="panel-error">{error}</div>:!events.length?<div className="panel-loading">No admin activity recorded yet.</div>:<div className="table-wrap"><table className="admin-table"><thead><tr><th>Action</th><th>Record</th><th>By</th><th>When</th></tr></thead><tbody>{events.map((event)=><tr key={event.id}><td><strong>{event.action.replace(/[._]/g," ")}</strong></td><td>{event.entity} {event.entityId||""}</td><td>{event.actor?.name||"System"}</td><td>{new Date(event.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>}</>;
}
