import { after, NextResponse } from "next/server";
import { ingestTranscript, type TranscriptPayload } from "@/lib/ingest";
import type { CallTier } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

// Shared-secret check. Providers vary in how they can authenticate, so accept the
// secret via header, bearer token, or query param. (A provider-specific HMAC adapter
// can replace this per integration.)
function authorized(req: Request): boolean {
  const secret = process.env.TRANSCRIPT_WEBHOOK_SECRET;
  if (!secret) return false; // endpoint stays closed until a secret is configured
  const url = new URL(req.url);
  const provided =
    req.headers.get("x-webhook-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    url.searchParams.get("token");
  return provided === secret;
}

// Forgiving field mapping so most providers' payloads work with the generic endpoint.
function normalize(body: Record<string, unknown>): TranscriptPayload | null {
  const str = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = body[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
  };

  const transcript = str("transcript", "text", "body", "summary");
  if (!transcript || transcript.length < 20) return null;

  const tierRaw = str("callTier", "tier");
  const callTier =
    tierRaw && ["TIER_1", "TIER_2", "TIER_3"].includes(tierRaw) ? (tierRaw as CallTier) : null;

  return {
    transcript,
    email: str("email", "customerEmail", "to_email"),
    phone: str("phone", "from", "caller", "customerPhone", "to", "to_number"),
    name: str("name", "customerName", "contactName"),
    owner: str("owner", "agent", "agentName", "user"),
    occurredAt: str("occurredAt", "timestamp", "endedAt", "startedAt", "date"),
    callTier,
    provider: str("provider", "source"),
    externalId: str("externalId", "callId", "id", "call_id"),
  };
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = normalize(body);
  if (!payload) {
    return NextResponse.json(
      { error: "Missing or too-short `transcript`." },
      { status: 400 },
    );
  }

  const result = await ingestTranscript(payload);

  // Run the (slower) AI extraction after responding so the provider's webhook doesn't time out.
  after(async () => {
    try {
      await result.extract();
    } catch (e) {
      console.error("transcript extraction failed:", e);
    }
  });

  if (result.matched) {
    return NextResponse.json(
      { matched: true, personId: result.personId, outreachId: result.outreachId },
      { status: 202 },
    );
  }
  return NextResponse.json(
    { matched: false, unmatchedCallId: result.unmatchedCallId },
    { status: 202 },
  );
}
