"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui";

export default function UploadRecording({
  personId,
  configured,
}: {
  personId: string;
  configured: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setError(false);
    setBusy(true);
    try {
      const form = e.currentTarget;
      const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
      const urlInput = form.elements.namedItem("url") as HTMLInputElement | null;
      const owner = (form.elements.namedItem("owner") as HTMLInputElement | null)?.value;
      const file = fileInput?.files?.[0];
      const pastedUrl = urlInput?.value?.trim();

      const body = new FormData();
      body.set("personId", personId);
      if (owner) body.set("owner", owner);

      if (file) {
        // Upload straight to storage (bypasses the 4.5 MB serverless body limit), then
        // hand the app the resulting URL to transcribe.
        setMsg("Uploading the recording…");
        const { upload } = await import("@vercel/blob/client");
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob-upload",
          contentType: file.type || undefined,
        });
        body.set("url", blob.url);
        setMsg("Transcribing… this can take a minute.");
      } else if (pastedUrl) {
        body.set("url", pastedUrl);
        setMsg("Transcribing… this can take a minute.");
      } else {
        setError(true);
        setMsg("Attach a file or paste a URL.");
        setBusy(false);
        return;
      }

      const res = await fetch("/api/upload-recording", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg("Uploaded and transcribed — the AI feedback is being filled in now.");
        setTimeout(() => router.refresh(), 1800);
      } else {
        setError(true);
        setMsg(data.error || "Upload failed.");
      }
    } catch (err) {
      setError(true);
      setMsg(err instanceof Error ? err.message : "Upload failed — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "block w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5";

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-medium"
      >
        <span>📼 Upload a call recording</span>
        <span className="text-black/40">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          {!configured && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Set <code>OPENAI_API_KEY</code> to enable recording transcription.
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium">Audio file <span className="font-normal text-black/40">(up to 25 MB — mp3, m4a, wav…)</span></label>
            <input type="file" name="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm" className={inputCls} />
          </div>
          <p className="text-center text-xs text-black/40">or</p>
          <div>
            <label className="mb-1 block text-xs font-medium">Public recording URL <span className="font-normal text-black/40">(good for larger files)</span></label>
            <input type="url" name="url" placeholder="https://…/recording.mp3" className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={busy || !configured}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-white/80"
          >
            {busy ? "Transcribing… (can take a minute)" : "Upload & transcribe"}
          </button>
          {msg && (
            <p className={`text-xs ${error ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
              {msg}
            </p>
          )}
        </form>
      )}
    </Card>
  );
}
