import { after, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { transcribeAudio, transcriptionUploadConfigured, MAX_AUDIO_BYTES } from "@/lib/transcribe";
import { logCallTranscript } from "@/lib/ingest";
import { prisma } from "@/lib/prisma";
import { resolveBlobToken } from "@/lib/blobToken";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // transcription can take a while

// Upload a call recording (file or a public URL), transcribe it, and log it against
// the selected person with AI-extracted feedback. NOTE: unauthenticated like the rest —
// keep the app URL private / add login before real use.
export async function POST(req: Request) {
  if (!transcriptionUploadConfigured()) {
    return NextResponse.json(
      { error: "Audio transcription isn't configured. Set OPENAI_API_KEY." },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const personId = String(form.get("personId") ?? "");
  const owner = form.get("owner") ? String(form.get("owner")) : null;
  if (!personId) {
    return NextResponse.json({ error: "Select a person." }, { status: 400 });
  }

  // Source: an uploaded file, or a public URL we fetch server-side (handy for large files
  // that would exceed the direct-upload body limit).
  const file = form.get("file");
  const url = form.get("url") ? String(form.get("url")).trim() : "";

  let bytes: ArrayBuffer;
  let filename: string;
  try {
    if (file && typeof file === "object" && "arrayBuffer" in file) {
      bytes = await (file as File).arrayBuffer();
      filename = (file as File).name || "recording.mp3";
    } else if (url) {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`Couldn't fetch the URL (${r.status}).`);
      bytes = await r.arrayBuffer();
      filename = url.split("/").pop()?.split("?")[0] || "recording.mp3";
      // If it's a blob we minted for this upload, delete it once we've read the audio.
      if (url.includes("blob.vercel-storage.com")) {
        const { token } = resolveBlobToken();
        after(() => del(url, token ? { token } : undefined).catch(() => {}));
      }
    } else {
      return NextResponse.json({ error: "Attach a file or provide a URL." }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't read the recording." },
      { status: 400 },
    );
  }

  if (bytes.byteLength > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "Recording is larger than 25 MB. Compress it, split it, or use a URL." },
      { status: 400 },
    );
  }

  let transcript: string;
  try {
    transcript = await transcribeAudio(bytes, filename);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Transcription failed." },
      { status: 502 },
    );
  }

  if (transcript.length < 20) {
    return NextResponse.json(
      { error: "The transcription came back empty or too short — is the audio clear speech?" },
      { status: 422 },
    );
  }

  let outreachId: string;
  let extract: () => Promise<void>;
  try {
    ({ outreachId, extract } = await logCallTranscript(personId, transcript, owner));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't save the transcript." },
      { status: 400 },
    );
  }

  // AI feedback extraction after responding, so the upload returns promptly.
  after(async () => {
    try {
      await extract();
    } catch (e) {
      console.error("[upload-recording] extraction failed:", e);
    }
  });

  return NextResponse.json({ ok: true, outreachId, personId });
}

export async function GET() {
  // Small helper for the UI to check configuration without exposing the key.
  const configured = transcriptionUploadConfigured();
  const count = await prisma.person.count().catch(() => 0);
  return NextResponse.json({ configured, people: count });
}
