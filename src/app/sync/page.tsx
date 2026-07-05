import { PageHeader, Card } from "@/components/ui";
import SyncPanel from "@/components/SyncPanel";
import { posthogConfigured } from "@/lib/posthog";
import { SEGMENT_QUERIES, SYNC_PRIORITY } from "@/lib/segment-queries";
import { SEGMENTS } from "@/lib/segments";

export const dynamic = "force-dynamic";

export default function SyncPage() {
  const configured = posthogConfigured();

  return (
    <div>
      <PageHeader
        title="Sync from PostHog"
        subtitle="Pull this week's outreach candidates straight from your segments."
      />

      <div className="max-w-3xl space-y-6">
        <SyncPanel configured={configured} />

        <Card>
          <h2 className="mb-1 text-sm font-semibold">How it works</h2>
          <p className="text-sm text-black/60 dark:text-white/60">
            Each segment below runs as a query against PostHog project {process.env.POSTHOG_PROJECT_ID ?? "—"}.
            Matching people are added to the tracker (or re-tagged), assigned their highest-priority
            segment. Your logged outreach and notes are never overwritten. Internal Smart Bricks
            accounts are excluded.
          </p>
          <ol className="mt-3 space-y-1.5 text-sm">
            {SYNC_PRIORITY.map((code) => (
              <li key={code} className="flex gap-2">
                <span className="font-medium">
                  {code} · {SEGMENTS[code].name}
                  {SEGMENTS[code].highValue && " ★"}
                </span>
                <span className="text-black/50 dark:text-white/50">
                  — {SEGMENT_QUERIES[code].signal}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
