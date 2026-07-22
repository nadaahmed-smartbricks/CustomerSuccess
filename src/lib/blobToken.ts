// If a Vercel account has more than one Blob store connected, Vercel can inject the
// token under a suffixed name (e.g. BLOB_READ_WRITE_TOKEN_STORE_ID) instead of the plain
// BLOB_READ_WRITE_TOKEN. Resolve whichever is actually present so we're not stuck on
// one exact name, and so upload + delete calls use the same token consistently.
export function resolveBlobToken(): { token: string | null; foundKeys: string[] } {
  const keys = Object.keys(process.env).filter((k) => k.startsWith("BLOB_READ_WRITE_TOKEN"));
  const direct = process.env.BLOB_READ_WRITE_TOKEN;
  if (direct) return { token: direct, foundKeys: keys };
  const fallbackKey = keys[0];
  return { token: fallbackKey ? process.env[fallbackKey] ?? null : null, foundKeys: keys };
}
