import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SEGMENTS } from "@/lib/segments";
import { updateOutreachStatus } from "@/lib/actions";
import { Badge, Card, PageHeader, ButtonLink, EmptyState } from "@/components/ui";
import CallButton from "@/components/CallButton";
import UploadRecording from "@/components/UploadRecording";
import { callConfigured } from "@/lib/twilioCall";
import { transcriptionUploadConfigured } from "@/lib/transcribe";
import {
  CHANNEL_ICONS,
  CHANNEL_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
  OUTCOME_LABELS,
  OBJECTIVE_BADGE,
  OBJECTIVE_LABELS,
  INCENTIVE_LABELS,
  INCENTIVE_STATUS_LABELS,
  CALL_TIER_LABELS,
  TIER_LABELS,
} from "@/lib/labels";
import type { OutreachStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const STATUSES: OutreachStatus[] = [
  "TO_CONTACT", "ATTEMPTED", "REACHED", "NO_RESPONSE", "DECLINED", "DONE",
];

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ exists?: string }>;
}) {
  const { id } = await params;
  const { exists } = await searchParams;
  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      outreaches: { orderBy: { occurredAt: "desc" }, include: { feedback: true } },
    },
  });

  if (!person) notFound();
  const seg = SEGMENTS[person.segment];

  return (
    <div>
      <PageHeader
        title={person.name}
        subtitle={person.phone ? `${person.email} · ${person.phone}` : person.email}
        action={
          <div className="flex items-center gap-2">
            <CallButton personId={person.id} configured={callConfigured()} hasPhone={!!person.phone} />
            <ButtonLink href={`/outreach/new?personId=${person.id}`}>+ Log a touch</ButtonLink>
          </div>
        }
      />

      {exists && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          This person is already tracked — here they are.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Segment context — what Justin/Product should know before reaching out */}
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                {person.segment} · {seg.name}
              </Badge>
              <Badge className={OBJECTIVE_BADGE[person.leadObjective]}>
                {OBJECTIVE_LABELS[person.leadObjective]}
              </Badge>
              <span className="text-xs text-black/50 dark:text-white/50">{TIER_LABELS[person.tier]}</span>
              {seg.highValue && <span title="High-value segment">★</span>}
            </div>
            <p className="text-sm text-black/70 dark:text-white/70">{seg.definition}</p>
            <p className="text-sm">
              <span className="font-medium">Recommended:</span> {seg.keyAction}
            </p>
            {person.activitySignal && (
              <p className="text-sm">
                <span className="font-medium">Activity signal:</span> {person.activitySignal}
              </p>
            )}
            <p className="text-sm">
              <span className="font-medium">Suggested incentive:</span> {seg.suggestedIncentive}
            </p>
            {person.notes && (
              <p className="text-sm text-black/70 dark:text-white/70">
                <span className="font-medium">Notes:</span> {person.notes}
              </p>
            )}
          </Card>

          <UploadRecording personId={person.id} configured={transcriptionUploadConfigured()} />

          {seg.questions.length > 0 && (
            <Card>
              <h3 className="mb-2 text-sm font-semibold">Feedback questions for {person.segment}</h3>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-black/70 dark:text-white/70">
                {seg.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
            </Card>
          )}
        </div>

        {/* Outreach history */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
            Outreach history ({person.outreaches.length})
          </h2>
          {person.outreaches.length === 0 ? (
            <EmptyState title="No outreach logged yet." hint="Log the first touch above." />
          ) : (
            <div className="space-y-4">
              {person.outreaches.map((o) => (
                <Card key={o.id} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg" aria-hidden>{CHANNEL_ICONS[o.channel]}</span>
                      <span className="font-medium">{CHANNEL_LABELS[o.channel]}</span>
                      {o.callTier && (
                        <span className="text-xs text-black/50 dark:text-white/50">
                          {CALL_TIER_LABELS[o.callTier]}
                        </span>
                      )}
                    </div>
                    <Badge className={STATUS_BADGE[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                  </div>

                  <p className="text-xs text-black/50 dark:text-white/50">
                    {o.owner} · {o.occurredAt.toLocaleString()} · {o.attempts} attempt{o.attempts === 1 ? "" : "s"}
                    {o.outcome ? ` · ${OUTCOME_LABELS[o.outcome]}` : ""}
                  </p>

                  {o.incentiveType !== "NONE" && (
                    <p className="text-sm">
                      🎁 {INCENTIVE_LABELS[o.incentiveType]} —{" "}
                      <span className="text-black/60 dark:text-white/60">
                        {INCENTIVE_STATUS_LABELS[o.incentiveStatus]}
                      </span>
                    </p>
                  )}

                  {o.aiSummary && (
                    <div className="rounded-lg border border-sky-300/50 bg-sky-50/50 p-3 text-sm dark:border-sky-500/30 dark:bg-sky-950/20">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
                        🎙️ AI call summary
                      </p>
                      {o.aiSummary}
                    </div>
                  )}

                  {o.notes && <p className="text-sm text-black/70 dark:text-white/70">{o.notes}</p>}

                  {o.transcript && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white">
                        View transcript
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/5 p-3 text-xs dark:bg-white/5">
                        {o.transcript}
                      </pre>
                    </details>
                  )}

                  {o.nextAction && (
                    <p className="text-sm">
                      <span className="font-medium">Next:</span> {o.nextAction}
                      {o.nextActionDueAt ? ` (by ${o.nextActionDueAt.toLocaleDateString()})` : ""}
                    </p>
                  )}

                  {o.feedback && (
                    <div className="rounded-lg bg-black/5 p-3 text-sm dark:bg-white/5">
                      <p className="mb-1 font-medium">Feedback captured</p>
                      {o.feedback.npsScore != null && <p>NPS: {o.feedback.npsScore}/10</p>}
                      {o.feedback.blocker && <p>Blocker: {o.feedback.blocker}</p>}
                      {o.feedback.featureRequest && <p>Feature request: {o.feedback.featureRequest}</p>}
                      {o.feedback.competitorTool && <p>Uses alongside: {o.feedback.competitorTool}</p>}
                      {o.feedback.quote && <p className="italic">“{o.feedback.quote}”</p>}
                      {o.feedback.themeTags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {o.feedback.themeTags.map((t) => (
                            <Badge key={t} className="bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {o.feedback.responses != null && (
                        <div className="mt-2 space-y-1">
                          {Object.entries(o.feedback.responses as Record<string, string>).map(([q, a]) => (
                            <p key={q}>
                              <span className="text-black/60 dark:text-white/60">{q}</span>
                              <br />
                              {a}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick status update */}
                  <form action={updateOutreachStatus} className="flex items-center gap-2 pt-1">
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="personId" value={person.id} />
                    <select
                      name="status"
                      defaultValue={o.status}
                      className="rounded-lg border border-black/15 bg-white px-2 py-1 text-xs dark:border-white/15 dark:bg-white/5"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-lg border border-black/15 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                    >
                      Update status
                    </button>
                  </form>
                </Card>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Link href="/people" className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white">
              ← All people
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
