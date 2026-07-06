// Twilio Voice Intelligence adapter.
//
// Twilio fires a form-encoded webhook when a transcript completes (carrying the
// transcript SID, not the text). We verify the X-Twilio-Signature, then fetch the
// sentences and caller identity from Twilio's API and hand a normalized payload to
// the generic ingestion pipeline.

import crypto from "node:crypto";
import type { TranscriptPayload } from "@/lib/ingest";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const INTELLIGENCE_BASE = "https://intelligence.twilio.com/v2";
const API_BASE = "https://api.twilio.com/2010-04-01";

export function twilioConfigured(): boolean {
  return Boolean(ACCOUNT_SID && AUTH_TOKEN);
}

/**
 * Reconstruct the exact public URL Twilio signed. Behind Vercel's proxy the request
 * host is a forwarded header; WEBHOOK_PUBLIC_BASE_URL overrides for reliability.
 */
export function twilioPublicUrl(req: Request): string {
  const override = process.env.WEBHOOK_PUBLIC_BASE_URL;
  const url = new URL(req.url);
  if (override) return `${override.replace(/\/$/, "")}${url.pathname}${url.search}`;
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}${url.pathname}${url.search}`;
}

/**
 * Validate the X-Twilio-Signature for a form-encoded webhook.
 * Signing string = full URL + each POST param (sorted by name) as name+value, no delimiters.
 * HMAC-SHA1 with the auth token, base64-encoded.
 */
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  if (!AUTH_TOKEN || !signature) return false;
  let data = url;
  for (const key of Object.keys(params).sort()) data += key + params[key];
  const expected = crypto.createHmac("sha1", AUTH_TOKEN).update(Buffer.from(data, "utf-8")).digest("base64");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function authHeader(): string {
  return "Basic " + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");
}

async function twilioGet(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { headers: { Authorization: authHeader() }, cache: "no-store" });
  if (!res.ok) throw new Error(`Twilio GET ${url} failed (${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

/** Fetch and assemble the transcript text from the Sentences endpoint (follows pagination). */
async function fetchTranscriptText(transcriptSid: string): Promise<string> {
  const lines: string[] = [];
  let next: string | null = `${INTELLIGENCE_BASE}/Transcripts/${transcriptSid}/Sentences?PageSize=200`;
  let guard = 0;
  while (next && guard++ < 20) {
    const data: Record<string, unknown> = await twilioGet(next);
    const sentences = (data.sentences as Array<Record<string, unknown>>) ?? [];
    for (const s of sentences) {
      const text = typeof s.transcript === "string" ? s.transcript : "";
      if (!text) continue;
      const channel = s.media_channel;
      lines.push(channel != null ? `Speaker ${channel}: ${text}` : text);
    }
    const meta = data.meta as Record<string, unknown> | undefined;
    next = meta && typeof meta.next_page_url === "string" ? meta.next_page_url : null;
  }
  return lines.join("\n");
}

/**
 * Best-effort caller identity. Twilio's recommended pattern is to set `customer_key`
 * when creating the transcript (to the person's email or phone); we also fall back to
 * the underlying Call's from/to numbers when the transcript references a Call SID.
 */
async function fetchIdentity(transcriptSid: string): Promise<{
  email: string | null;
  phone: string | null;
  name: string | null;
  occurredAt: string | null;
}> {
  const t = await twilioGet(`${INTELLIGENCE_BASE}/Transcripts/${transcriptSid}`);

  let email: string | null = null;
  let phone: string | null = null;
  const name: string | null = null;

  const customerKey = typeof t.customer_key === "string" ? t.customer_key : null;
  if (customerKey) {
    if (customerKey.includes("@")) email = customerKey;
    else phone = customerKey;
  }

  // The transcript's channel points at the source Call/Recording; pull from/to off the Call.
  const channel = t.channel as Record<string, unknown> | undefined;
  const mediaProps = channel?.media_properties as Record<string, unknown> | undefined;
  const sourceSid = typeof mediaProps?.source_sid === "string" ? mediaProps.source_sid : null;
  if (!phone && sourceSid) {
    try {
      let callSid = sourceSid;
      if (sourceSid.startsWith("RE")) {
        const rec = await twilioGet(`${API_BASE}/Accounts/${ACCOUNT_SID}/Recordings/${sourceSid}.json`);
        if (typeof rec.call_sid === "string") callSid = rec.call_sid;
      }
      if (callSid.startsWith("CA")) {
        const call = await twilioGet(`${API_BASE}/Accounts/${ACCOUNT_SID}/Calls/${callSid}.json`);
        // The customer is whichever leg isn't our Twilio number; default to `to`.
        const to = typeof call.to === "string" ? call.to : null;
        const from = typeof call.from === "string" ? call.from : null;
        phone = to || from;
      }
    } catch {
      // best effort — leave phone null, the call lands in the unmatched queue
    }
  }

  const occurredAt = typeof t.date_created === "string" ? t.date_created : null;
  return { email, phone, name, occurredAt };
}

/** Build a normalized TranscriptPayload from a completed transcript SID. */
export async function buildPayloadFromTranscript(transcriptSid: string): Promise<TranscriptPayload> {
  const [transcript, identity] = await Promise.all([
    fetchTranscriptText(transcriptSid),
    fetchIdentity(transcriptSid),
  ]);
  return {
    transcript,
    email: identity.email,
    phone: identity.phone,
    name: identity.name,
    occurredAt: identity.occurredAt,
    owner: "Justin",
    provider: "twilio",
    externalId: transcriptSid,
  };
}
