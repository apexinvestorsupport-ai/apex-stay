import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";

export const runtime = "nodejs";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(request: Request) {
  const auth = await requireApiUser(["OWNER", "MANAGER", "AGENT"]);
  if (auth.response) return auth.response;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Image storage is not configured. Add BLOB_READ_WRITE_TOKEN to the deployment." }, { status: 503 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
  if (!MIME_EXTENSIONS[file.type] || file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Use a JPEG, PNG, WebP, or AVIF image up to 4 MB." }, { status: 400 });
  }
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const validSignature =
    (file.type === "image/jpeg" && signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff) ||
    (file.type === "image/png" && signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47) ||
    (file.type === "image/webp" && String.fromCharCode(...signature.slice(8, 12)) === "WEBP") ||
    (file.type === "image/avif" && String.fromCharCode(...signature.slice(4, 8)) === "ftyp");
  if (!validSignature) return NextResponse.json({ error: "The file contents do not match the selected image type." }, { status: 400 });
  const blob = await put(`listings/${crypto.randomUUID()}.${MIME_EXTENSIONS[file.type]}`, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
  });
  return NextResponse.json({ url: blob.url }, { status: 201 });
}
