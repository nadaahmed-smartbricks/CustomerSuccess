// Direct audio-file transcription (no Twilio). Sends an uploaded recording to a
// speech-to-text API and returns the text, which then runs through the same AI
// feedback extraction as everything else.

const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_TRANSCRIBE_MODEL ?? "whisper-1";
const ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";

export function transcriptionUploadConfigured(): boolean {
  return Boolean(KEY);
}

// OpenAI's transcription endpoint caps files at 25 MB.
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/** Transcribe an audio file's bytes to text. */
export async function transcribeAudio(bytes: ArrayBuffer, filename: string): Promise<string> {
  if (!KEY) {
    throw new Error("Audio transcription isn't configured — set OPENAI_API_KEY.");
  }
  if (bytes.byteLength > MAX_AUDIO_BYTES) {
    throw new Error("Recording is larger than 25 MB. Compress it or split it into shorter files.");
  }

  const form = new FormData();
  form.append("file", new Blob([bytes]), filename || "recording.mp3");
  form.append("model", MODEL);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Transcription failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}
