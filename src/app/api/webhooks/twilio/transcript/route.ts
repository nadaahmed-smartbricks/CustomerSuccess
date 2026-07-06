import { after, NextResponse } from "next/server";
import { verifyTwilioSignature, twilioConfigured, buildPayloadFromTranscript } from "@/lib/twilio";
import { ingestTranscript } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // needs node:crypto for HMAC

// Reconstruct the exact public URL Twilio signed. Behind Vercel's proxy the request
// host is a forwarded header; allow an explicit override for reliability.
function publicUrl(req: Request): string {
  const override = process.env.WEBHOOK_PUBLIC_BASE_URL;
  const url = new URL(req.url);
  if (override) return `${override.replace(/\/$/, "")}${url.pathname}${url.search}`;
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}${url.pathname}${url.search}`;
}

export async function POST(req: Request) {
  if (!twilioConfigured()) {
    return NextResponse.json({ error: "Twilio is not configured." }, { status: 503 });
  }

  // Twilio sends application/x-www-form-urlencoded.
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = typeof v === "string" ? v : "";

  const signature = req.headers.get("x-twilio-signature");
  if (!verifyTwilioSignature(publicUrl(req), params, signature)) {
    return NextResponse.json({ error: "Invalid Twilio signature" }, { status: 403 });
  }

  const transcriptSid = params.transcript_sid || params.TranscriptSid;
  const status = params.status || params.Status;
  if (!transcriptSid) {
    return NextResponse.json({ error: "Missing transcript_sid" }, { status: 400 });
  }
  // Only ingest completed transcripts; acknowledge other lifecycle events.
  if (status && status !== "completed") {
    return NextResponse.json({ ignored: true, status }, { status: 200 });
  }

  // Fetching sentences + call metadata and running extraction happen after we respond,
  // so Twilio's webhook doesn't wait on them.
  after(async () => {
    try {
      const payload = await buildPayloadFromTranscript(transcriptSid);
      if (!payload.transcript || payload.transcript.length < 20) return;
      const result = await ingestTranscript(payload);
      await result.extract();
    } catch (e) {
      console.error("twilio transcript ingestion failed:", e);
    }
  });

  return NextResponse.json({ received: true, transcriptSid }, { status: 202 });
}
