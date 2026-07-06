import { after, NextResponse } from "next/server";
import { verifyTwilioSignature, twilioPublicUrl } from "@/lib/twilio";
import { createTranscript } from "@/lib/twilioCall";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Twilio POSTs here when the call recording is ready. We kick off a Voice Intelligence
// transcript tagged with the person's email (customer_key), which then flows back through
// /api/webhooks/twilio/transcript and into the person's history.
export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = typeof v === "string" ? v : "";

  const signature = req.headers.get("x-twilio-signature");
  if (!verifyTwilioSignature(twilioPublicUrl(req), params, signature)) {
    return NextResponse.json({ error: "Invalid Twilio signature" }, { status: 403 });
  }

  const recordingSid = params.RecordingSid;
  const status = params.RecordingStatus;
  const personId = new URL(req.url).searchParams.get("personId");

  if (status === "completed" && recordingSid) {
    after(async () => {
      try {
        const person = personId
          ? await prisma.person.findUnique({ where: { id: personId }, select: { email: true } })
          : null;
        const sid = await createTranscript(recordingSid, person?.email ?? null);
        console.log(`[call-recording] ${recordingSid}: created transcript ${sid} for ${person?.email}`);
      } catch (e) {
        console.error(`[call-recording] ${recordingSid} transcript creation failed:`, e);
      }
    });
  }

  return NextResponse.json({ received: true }, { status: 202 });
}
