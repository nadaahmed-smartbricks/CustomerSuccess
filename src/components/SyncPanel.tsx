"use client";

import { useActionState } from "react";
import Link from "next/link";
import { syncFromPostHog, type SyncActionState } from "@/lib/actions";
import { Card, Badge } from "@/components/ui";
import { OBJECTIVE_BADGE, OBJECTIVE_LABELS } from "@/lib/labels";
import { SEGMENTS } from "@/lib/segments";

export default function SyncPanel({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState<SyncActionState>(syncFromPostHog, null);

  return (
    <div className="space-y-4">
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending || !configured}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-white/80"
        >
          {pending ? "Syncing from PostHog…" : "Run sync from PostHog"}
        </button>
        {!configured && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            Set <code>POSTHOG_API_KEY</code> and <code>POSTHOG_PROJECT_ID</code> to enable the sync.
          </p>
        )}
      </form>

      {state && !state.ok && (
        <Card className="border-rose-300 bg-rose-50 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {state.error}
        </Card>
      )}

      {state && state.ok && (
        <Card className="space-y-3">
          <p className="text-sm font-medium">
            Synced — {state.summary.totalCreated} new, {state.summary.totalUpdated} re-tagged.{" "}
            <Link href="/people" className="underline">
              View people →
            </Link>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                  <th className="py-1 pr-3">Segment</th>
                  <th className="py-1 pr-3">Objective</th>
                  <th className="py-1 pr-3 text-right">Matched</th>
                  <th className="py-1 pr-3 text-right">New</th>
                  <th className="py-1 pr-3 text-right">Re-tagged</th>
                </tr>
              </thead>
              <tbody>
                {state.summary.results.map((r) => (
                  <tr key={r.segment} className="border-t border-black/5 dark:border-white/5">
                    <td className="py-1.5 pr-3">
                      {r.segment} · {r.name}
                      {SEGMENTS[r.segment].highValue && <span title="High-value"> ★</span>}
                    </td>
                    <td className="py-1.5 pr-3">
                      <Badge className={OBJECTIVE_BADGE[SEGMENTS[r.segment].leadObjective]}>
                        {OBJECTIVE_LABELS[SEGMENTS[r.segment].leadObjective]}
                      </Badge>
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {r.error ? "—" : r.matched}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{r.created}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{r.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.summary.results.some((r) => r.error) && (
            <div className="text-xs text-rose-700 dark:text-rose-400">
              {state.summary.results
                .filter((r) => r.error)
                .map((r) => (
                  <p key={r.segment}>
                    {r.segment}: {r.error}
                  </p>
                ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
