import { after, NextResponse } from "next/server";
import { verifyTwilioSignature, twilioConfigured, buildPayloadFromTranscript, twilioPublicUrl } from "@/lib/twilio";
import { ingestTranscript } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // needs node:crypto for HMAC

export async function POST(req: Request) {
  if (!twilioConfigured()) {
    return NextResponse.json({ error: "Twilio is not configured." }, { status: 503 });
  }

  // Twilio sends application/x-www-form-urlencoded.
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = typeof v === "string" ? v : "";

  const signature = req.headers.get("x-twilio-signature");
  if (!verifyTwilioSignature(twilioPublicUrl(req), params, signature)) {
    return NextResponse.json({ error: "Invalid Twilio signature" }, { status: 403 });
  }

  console.log("[twilio-webhook] received params:", JSON.stringify(params));

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
      console.log(
        `[twilio-webhook] ${transcriptSid}: transcript ${payload.transcript.length} chars, email=${payload.email}, phone=${payload.phone}`,
      );
      if (!payload.transcript || payload.transcript.length < 20) {
        console.warn(`[twilio-webhook] ${transcriptSid}: transcript too short, skipping`);
        return;
      }
      const result = await ingestTranscript(payload);
      console.log(`[twilio-webhook] ${transcriptSid}: ingest kind=${result.kind}`);
      if (result.kind === "excluded") return;
      await result.extract();
      console.log(`[twilio-webhook] ${transcriptSid}: extraction complete`);
    } catch (e) {
      console.error(`[twilio-webhook] ${transcriptSid} ingestion failed:`, e);
    }
  });

  return NextResponse.json({ received: true, transcriptSid }, { status: 202 });
}
