"use client";

import { useState, useTransition } from "react";

export default function CallButton({
  personId,
  configured,
  hasPhone,
}: {
  personId: string;
  configured: boolean;
  hasPhone: boolean;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  if (!configured) return null;

  function call() {
    setMsg(null);
    setError(false);
    start(async () => {
      const res = await fetch("/api/call", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ personId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg("Calling — your phone should ring now. Answer it to connect the customer.");
      } else {
        setError(true);
        setMsg(data.error || "Couldn't start the call.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={call}
        disabled={pending || !hasPhone}
        title={hasPhone ? "" : "Add a phone number to this person first"}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        📞 {pending ? "Calling…" : "Call via Twilio"}
      </button>
      {msg && (
        <p className={`max-w-xs text-right text-xs ${error ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
          {msg}
        </p>
      )}
    </div>
  );
}
