"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, KeyRound, ShieldCheck } from "lucide-react";

export function AccessForm({ setupAvailable, configured, ownerExists }: { setupAvailable: boolean; configured: boolean; ownerExists: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(setupAvailable ? "/api/auth/setup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Check the details and try again.");
      router.replace("/admin");
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "We could not complete the request.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="access-page">
      <Link href="/" className="access-back"><ArrowLeft size={15} /> Public website</Link>
      <section className="access-card">
        <div className="access-mark">{setupAvailable ? <KeyRound /> : <ShieldCheck />}</div>
        <span className="eyebrow">{setupAvailable ? "A secure first step" : "Apex Stay · Management"}</span>
        <h1>{setupAvailable ? "Create your owner account." : "Welcome back."}</h1>
        <p>{setupAvailable ? "Set up the first owner account. Your setup secret is required and this step closes as soon as an owner is created." : "Sign in to manage your apartments and enquiries."}</p>
        {!configured ? <div className="config-blocker" role="status"><strong>Database not configured.</strong><span>Add PostgreSQL <code>DATABASE_URL</code> and <code>DIRECT_URL</code> before creating an owner account.</span></div> : !ownerExists && !setupAvailable ? <div className="config-blocker" role="status"><strong>Owner setup is disabled.</strong><span>Set a private <code>SETUP_SECRET</code> in this installation’s environment, then reload this page.</span></div> : null}
        <form onSubmit={submit} className="access-form">
          {setupAvailable && <>
            <label>Your name<input name="name" required minLength={2} maxLength={100} autoComplete="name" /></label>
            <label>Setup secret<input name="setupSecret" type="password" required autoComplete="off" /></label>
          </>}
          <label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
          <label>Password<input name="password" type="password" required minLength={setupAvailable ? 12 : 1} maxLength={128} autoComplete={setupAvailable ? "new-password" : "current-password"} /></label>
          <button className="button button-dark access-submit" disabled={busy || !configured || (!ownerExists && !setupAvailable)}>{busy ? "Please wait…" : setupAvailable ? <>Create owner account <ArrowRight size={16} /></> : <>Sign in securely <ArrowRight size={16} /></>}</button>
          <p className="form-feedback" role="alert">{error}</p>
        </form>
        {setupAvailable && <p className="access-note">The owner password must be at least 12 characters. Do not share your setup secret.</p>}
      </section>
      <p className="access-footer">Your account and information stay on this business’s own installation.</p>
    </div>
  );
}
