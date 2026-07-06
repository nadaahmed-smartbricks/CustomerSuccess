import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dismissUnmatchedCall } from "@/lib/actions";
import { Card, PageHeader, EmptyState, ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CallsPage() {
  const calls = await prisma.unmatchedCall.findMany({
    where: { handled: false },
    orderBy: { occurredAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <PageHeader
        title="Unmatched calls"
        subtitle="Call transcripts that arrived by webhook but didn't match a tracked person."
      />

      {calls.length === 0 ? (
        <EmptyState
          title="No unmatched calls."
          hint="When a call transcript can't be matched to a person by phone or email, it lands here."
        />
      ) : (
        <div className="space-y-4">
          {calls.map((c) => {
            const label = c.name || c.phone || c.email || "Unknown caller";
            const addHref = `/people/new?${new URLSearchParams({
              ...(c.name ? { name: c.name } : {}),
              ...(c.phone ? { phone: c.phone } : {}),
              ...(c.email ? { email: c.email } : {}),
            }).toString()}`;
            return (
              <Card key={c.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{label}</span>
                    <p className="text-xs text-black/50 dark:text-white/50">
                      {[c.phone, c.email].filter(Boolean).join(" · ")}
                      {c.provider ? ` · via ${c.provider}` : ""} · {c.occurredAt.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ButtonLink href={addHref} variant="ghost">Add as person</ButtonLink>
                    <form action={dismissUnmatchedCall}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-black/15 px-3 py-2 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                      >
                        Dismiss
                      </button>
                    </form>
                  </div>
                </div>

                {c.aiSummary && (
                  <div className="rounded-lg border border-sky-300/50 bg-sky-50/50 p-3 text-sm dark:border-sky-500/30 dark:bg-sky-950/20">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
                      🎙️ AI call summary
                    </p>
                    {c.aiSummary}
                  </div>
                )}

                <details className="text-sm">
                  <summary className="cursor-pointer text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white">
                    View transcript
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/5 p-3 text-xs dark:bg-white/5">
                    {c.transcript}
                  </pre>
                </details>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-sm text-black/50 dark:text-white/50">
        Once a caller is added as a tracked person (with their phone), future calls match
        automatically and appear in their history — no manual step.{" "}
        <Link href="/people" className="underline">People →</Link>
      </p>
    </div>
  );
}
