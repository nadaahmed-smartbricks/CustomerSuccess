import { NextResponse } from "next/server";
import { startCall } from "@/lib/twilioCall";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Initiate a click-to-call. NOTE: this endpoint triggers a billable call and is
// currently unauthenticated — keep the app URL private and add login before real use.
export async function POST(req: Request) {
  let body: { personId?: string };
  try {
    body = (await req.json()) as { personId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.personId) {
    return NextResponse.json({ error: "personId is required" }, { status: 400 });
  }

  const result = await startCall(body.personId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, callSid: result.callSid, name: result.name });
}
