import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return <section className="not-found shell"><span className="eyebrow">404 · Wrong turn</span><h1>This place isn’t on the map.</h1><p>The page or apartment you’re looking for may have moved, or may no longer be available.</p><Link className="button button-dark" href="/"><ArrowLeft size={16} /> Back to the homepage</Link></section>;
}
