import { NextResponse } from "next/server";
import { verifyTwilioSignature, twilioPublicUrl } from "@/lib/twilio";
import { dialCustomerTwiml } from "@/lib/twilioCall";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Twilio POSTs here when the agent answers; we return TwiML that dials the customer.
export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = typeof v === "string" ? v : "";

  const signature = req.headers.get("x-twilio-signature");
  if (!verifyTwilioSignature(twilioPublicUrl(req), params, signature)) {
    return NextResponse.json({ error: "Invalid Twilio signature" }, { status: 403 });
  }

  const personId = new URL(req.url).searchParams.get("personId");
  const person = personId
    ? await prisma.person.findUnique({ where: { id: personId } })
    : null;
  if (!person?.phone) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>No customer number on file. Goodbye.</Say></Response>`,
      { headers: { "content-type": "text/xml" } },
    );
  }

  return new NextResponse(dialCustomerTwiml(person.phone, person.id), {
    headers: { "content-type": "text/xml" },
  });
}
