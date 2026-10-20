"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Application error", error);
  }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#fbfaf7", color: "#20332e", fontFamily: "Arial, sans-serif" }}>
        <main style={{ maxWidth: 660, margin: "15vh auto", padding: 28 }}>
          <p style={{ color: "#73817c", fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase" }}>Apex Stay · Error</p>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 42, fontWeight: 400 }}>We couldn’t load this page.</h1>
          <p style={{ color: "#73817c", lineHeight: 1.7 }}>The request failed. Check the database and service configuration, then try again. If the problem continues, contact the site administrator.</p>
          <button onClick={() => reset()} style={{ padding: "12px 18px", border: 0, background: "#174c43", color: "white", cursor: "pointer" }}>Try again</button>
        </main>
      </body>
    </html>
  );
}
