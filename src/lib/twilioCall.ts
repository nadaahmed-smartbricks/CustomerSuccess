// Click-to-call: ring the agent (Justin) first, then bridge the customer and record.
// The recording's completion callback creates a Voice Intelligence transcript, which
// flows back through the existing /api/webhooks/twilio/transcript pipeline.

import twilio from "twilio";
import { prisma } from "@/lib/prisma";

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_FROM_NUMBER; // your Twilio number (caller ID)
const AGENT = process.env.AGENT_PHONE; // Justin's mobile — where Twilio rings first
const VI_SERVICE = process.env.TWILIO_INTELLIGENCE_SERVICE_SID; // GAxxxx
const BASE = process.env.WEBHOOK_PUBLIC_BASE_URL;

export function callConfigured(): boolean {
  return Boolean(SID && TOKEN && FROM && AGENT && BASE);
}
export function transcriptionConfigured(): boolean {
  return Boolean(VI_SERVICE);
}

function client() {
  return twilio(SID, TOKEN);
}

/** Stored phones are digits only; Twilio needs E.164 (+…). */
export function toE164(raw: string): string {
  const d = raw.replace(/[^\d+]/g, "");
  return d.startsWith("+") ? d : `+${d}`;
}

function base(): string {
  return (BASE ?? "").replace(/\/$/, "");
}

export type StartCallResult =
  | { ok: true; callSid: string; name: string }
  | { ok: false; error: string };

/** Ring the agent; when they answer, Twilio fetches the TwiML that dials the customer. */
export async function startCall(personId: string): Promise<StartCallResult> {
  if (!callConfigured()) {
    return {
      ok: false,
      error:
        "Calling isn't configured. Set TWILIO_FROM_NUMBER, AGENT_PHONE and WEBHOOK_PUBLIC_BASE_URL.",
    };
  }
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) return { ok: false, error: "Person not found." };
  if (!person.phone) {
    return { ok: false, error: "This person has no phone number — add one on their profile first." };
  }

  try {
    const call = await client().calls.create({
      to: toE164(AGENT!),
      from: FROM!,
      url: `${base()}/api/call/twiml?personId=${person.id}`,
    });
    return { ok: true, callSid: call.sid, name: person.name };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** TwiML returned when the agent answers: dial the customer and record the bridged call. */
export function dialCustomerTwiml(customerPhone: string, personId: string): string {
  const cb = `${base()}/api/call/recording?personId=${personId}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting your call now.</Say>
  <Dial record="record-from-answer-dual" recordingStatusCallback="${cb}" recordingStatusCallbackEvent="completed" callerId="${FROM}">
    <Number>${toE164(customerPhone)}</Number>
  </Dial>
</Response>`;
}

/** Create a Voice Intelligence transcript from a finished recording, tagged with the person. */
export async function createTranscript(
  recordingSid: string,
  customerKey: string | null,
): Promise<string | null> {
  if (!transcriptionConfigured()) return null;
  const t = await client().intelligence.v2.transcripts.create({
    serviceSid: VI_SERVICE!,
    channel: { media_properties: { source_sid: recordingSid } },
    customerKey: customerKey ?? undefined,
  });
  return t.sid;
}
