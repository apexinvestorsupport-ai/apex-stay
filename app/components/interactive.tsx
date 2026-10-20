"use client";

import { useState, useSyncExternalStore } from "react";
import { Heart, Send } from "lucide-react";
import Link from "next/link";

function subscribeFavorites(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("apex-favorites-updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("apex-favorites-updated", callback);
  };
}

function getFavoriteIds() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem("apex-favorites") || "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function FavoriteButton({ listingId }: { listingId: string }) {
  const saved = useSyncExternalStore(
    subscribeFavorites,
    () => getFavoriteIds().includes(listingId),
    () => false,
  );
  function toggle() {
    try {
      const ids = getFavoriteIds();
      const next = saved ? ids.filter((id) => id !== listingId) : [...new Set([...ids, listingId])];
      localStorage.setItem("apex-favorites", JSON.stringify(next));
      window.dispatchEvent(new Event("apex-favorites-updated"));
    } catch {
      return;
    }
  }
  return <button type="button" className={`favorite-button ${saved ? "is-saved" : ""}`} onClick={toggle} aria-label={saved ? "Remove from saved apartments" : "Save apartment"} aria-pressed={saved}><Heart size={18} fill={saved ? "currentColor" : "none"} /></button>;
}

export function EnquiryForm({ listingId, title }: { listingId?: string; title?: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setMessage("");
    const form = new FormData(formElement);
    const body = {
      listingId: listingId || "",
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      message: form.get("message"),
      consent: form.get("consent") === "on",
      website: form.get("website"),
    };
    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Please check your details and try again.");
      formElement.reset();
      setMessage(result.emailStatus === "sent"
        ? "Thank you. Your enquiry was received and the team has been notified."
        : "Thank you. Your enquiry was saved for the property team.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not send your message. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="enquiry-form" onSubmit={submit}>
      <h3>{title ? `Ask about ${title}` : "Send us a message"}</h3>
      <p>We’ll only use your details to respond to this enquiry.</p>
      <label>Your name<input name="name" required minLength={2} maxLength={100} autoComplete="name" /></label>
      <label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
      <label>Phone <span className="muted">(optional)</span><input name="phone" type="tel" maxLength={32} autoComplete="tel" /></label>
      <label>Message<textarea name="message" required minLength={10} maxLength={4000} rows={4} defaultValue={title ? `Hi, I’m interested in ${title}.` : ""} /></label>
      <label className="consent-row"><input name="consent" type="checkbox" required /><span>I agree that my details may be used to respond to my enquiry. See our <Link href="/privacy">Privacy Policy</Link>.</span></label>
      <div className="honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <button className="button button-dark form-submit" disabled={busy}>{busy ? "Sending…" : <>Send enquiry <Send size={15} /></>}</button>
      <p className="form-feedback" aria-live="polite">{message}</p>
    </form>
  );
}
