import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { MAX_AUDIO_BYTES } from "@/lib/transcribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Issues a short-lived token so the browser can upload a recording straight to Vercel
// Blob storage — bypassing the 4.5 MB serverless request-body limit. Requires a Blob
// store (BLOB_READ_WRITE_TOKEN). Unauthenticated like the rest — add login before real use.
export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        // Audio only; capped at Whisper's 25 MB limit.
        allowedContentTypes: ["audio/*", "video/mp4", "application/octet-stream"],
        maximumSizeInBytes: MAX_AUDIO_BYTES,
        addRandomSuffix: true,
      }),
      // We process the file via /api/upload-recording after the client hands us the URL,
      // so nothing is needed here.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Blob upload token error" },
      { status: 400 },
    );
  }
}
