import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SEGMENTS, SEGMENT_ORDER } from "@/lib/segments";
import { Card, Stat, PageHeader, EmptyState, Badge, BarRow } from "@/components/ui";
import {
  OUTCOME_LABELS,
  CHANNEL_LABELS,
  CHANNEL_ICONS,
  OBJECTIVE_LABELS,
  OBJECTIVE_BADGE,
} from "@/lib/labels";
import type { Outcome, Channel, Objective } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;
const startOfWeek = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x;
};

function countBy<T, K extends string>(items: T[], key: (t: T) => K | null | undefined) {
  const out = {} as Record<K, number>;
  for (const it of items) {
    const k = key(it);
    if (k == null) continue;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export default async function ReviewPage() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY);

  const [outreaches, peopleBySegment] = await Promise.all([
    prisma.outreach.findMany({
      orderBy: { occurredAt: "desc" },
      include: { person: true, feedback: true },
    }),
    prisma.person.groupBy({ by: ["segment"], _count: { _all: true } }),
  ]);

  const feedback = outreaches.map((o) => o.feedback).filter((f) => f !== null);
  const thisWeek = outreaches.filter((o) => o.occurredAt >= weekAgo);

  // --- NPS ---
  const nps = feedback.map((f) => f!.npsScore).filter((n): n is number => n != null);
  const promoters = nps.filter((n) => n >= 9).length;
  const passives = nps.filter((n) => n >= 7 && n <= 8).length;
  const detractors = nps.filter((n) => n <= 6).length;
  const npsScore = nps.length
    ? Math.round(((promoters - detractors) / nps.length) * 100)
    : null;
  const avgNps = nps.length ? (nps.reduce((a, b) => a + b, 0) / nps.length).toFixed(1) : "—";

  // --- Weekly touch trend (last 8 weeks) ---
  const weekBuckets: { label: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const start = startOfWeek(new Date(now.getTime() - i * 7 * DAY));
    const end = new Date(start.getTime() + 7 * DAY);
    const count = outreaches.filter((o) => o.occurredAt >= start && o.occurredAt < end).length;
    weekBuckets.push({
      label: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count,
    });
  }
  const maxWeek = Math.max(1, ...weekBuckets.map((w) => w.count));

  // --- Outcomes / channels ---
  const outcomes = countBy(outreaches, (o) => o.outcome as Outcome | null);
  const channels = countBy(outreaches, (o) => o.channel as Channel);
  const objectives = countBy(outreaches, (o) => o.person.leadObjective as Objective);
  const conversions = outcomes.CONVERTED ?? 0;

  // --- Feature requests, themes, blockers, competitors ---
  const featureRequests = outreaches
    .filter((o) => o.feedback?.featureRequest)
    .map((o) => ({
      text: o.feedback!.featureRequest!,
      person: o.person.name,
      personId: o.personId,
      segment: o.person.segment,
      date: o.occurredAt,
    }));

  const themeCounts = countBy(
    feedback.flatMap((f) => f!.themeTags),
    (t) => t,
  );
  const themes = Object.entries(themeCounts).sort((a, b) => b[1] - a[1]);
  const maxTheme = Math.max(1, ...themes.map(([, n]) => n));

  const blockers = outreaches
    .filter((o) => o.feedback?.blocker)
    .map((o) => ({ text: o.feedback!.blocker!, person: o.person.name, personId: o.personId }));

  const competitors = Object.entries(
    countBy(feedback.map((f) => f!.competitorTool), (t) => (t ? t.trim() : null)),
  ).sort((a, b) => b[1] - a[1]);

  // --- Segment coverage ---
  const totalBySegment = Object.fromEntries(
    peopleBySegment.map((p) => [p.segment, p._count._all]),
  ) as Record<string, number>;
  const contactedBySegment = countBy(
    // one entry per unique contacted person
    Array.from(new Map(outreaches.map((o) => [o.personId, o])).values()),
    (o) => o.person.segment,
  );

  const hasData = outreaches.length > 0;

  return (
    <div>
      <PageHeader
        title="Weekly review"
        subtitle="What outreach happened, and what customers told us."
      />

      {!hasData ? (
        <EmptyState
          title="Nothing to review yet."
          hint="Log some outreach and feedback, then this becomes your weekly check-in view."
        />
      ) : (
        <div className="space-y-8">
          {/* Headline stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Touches this week" value={thisWeek.length} hint="last 7 days" />
            <Stat label="Feedback captured" value={feedback.length} />
            <Stat label="NPS" value={npsScore ?? "—"} hint={`avg ${avgNps} · n=${nps.length}`} />
            <Stat label="Conversions" value={conversions} hint="all time" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* NPS breakdown */}
            <Card className="space-y-3">
              <h2 className="text-sm font-semibold">NPS breakdown</h2>
              {nps.length === 0 ? (
                <p className="text-sm text-black/50 dark:text-white/50">No NPS scores logged yet.</p>
              ) : (
                <>
                  <div className="flex h-3 overflow-hidden rounded-full">
                    <div className="bg-emerald-500" style={{ flex: promoters || 0.0001 }} title={`Promoters: ${promoters}`} />
                    <div className="bg-amber-400" style={{ flex: passives || 0.0001 }} title={`Passives: ${passives}`} />
                    <div className="bg-rose-500" style={{ flex: detractors || 0.0001 }} title={`Detractors: ${detractors}`} />
                  </div>
                  <div className="flex justify-between text-xs text-black/60 dark:text-white/60">
                    <span>😍 {promoters} promoters</span>
                    <span>😐 {passives} passives</span>
                    <span>😞 {detractors} detractors</span>
                  </div>
                </>
              )}
            </Card>

            {/* Weekly trend */}
            <Card className="space-y-3">
              <h2 className="text-sm font-semibold">Touches per week</h2>
              <div className="flex h-28 items-end gap-1.5">
                {weekBuckets.map((w, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-sky-500/80"
                      style={{ height: `${(w.count / maxWeek) * 100}%`, minHeight: w.count ? 4 : 0 }}
                      title={`${w.count} touches`}
                    />
                    <span className="text-[10px] text-black/40 dark:text-white/40">{w.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Outcomes */}
            <Card className="space-y-2">
              <h2 className="mb-1 text-sm font-semibold">Outcomes</h2>
              {(Object.keys(outcomes) as Outcome[]).length === 0 ? (
                <p className="text-sm text-black/50 dark:text-white/50">No outcomes recorded.</p>
              ) : (
                (Object.entries(outcomes) as [Outcome, number][])
                  .sort((a, b) => b[1] - a[1])
                  .map(([o, n]) => (
                    <BarRow
                      key={o}
                      label={OUTCOME_LABELS[o]}
                      value={n}
                      max={Math.max(...Object.values(outcomes))}
                      colorClass="bg-indigo-400 dark:bg-indigo-500"
                    />
                  ))
              )}
            </Card>

            {/* Channels */}
            <Card className="space-y-2">
              <h2 className="mb-1 text-sm font-semibold">Channels used</h2>
              {(Object.entries(channels) as [Channel, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([c, n]) => (
                  <BarRow
                    key={c}
                    label={`${CHANNEL_ICONS[c]} ${CHANNEL_LABELS[c]}`}
                    value={n}
                    max={Math.max(...Object.values(channels))}
                    colorClass="bg-teal-400 dark:bg-teal-500"
                  />
                ))}
            </Card>
          </div>

          {/* Feature request leaderboard + themes */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-3">
              <h2 className="text-sm font-semibold">Feature requests ({featureRequests.length})</h2>
              {featureRequests.length === 0 ? (
                <p className="text-sm text-black/50 dark:text-white/50">None captured yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {featureRequests.map((fr, i) => (
                    <li key={i} className="flex flex-col">
                      <span>{fr.text}</span>
                      <Link
                        href={`/people/${fr.personId}`}
                        className="text-xs text-black/50 hover:underline dark:text-white/50"
                      >
                        {fr.person} · {fr.segment} · {fr.date.toLocaleDateString()}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="space-y-3">
              <h2 className="text-sm font-semibold">Roadmap themes</h2>
              {themes.length === 0 ? (
                <p className="text-sm text-black/50 dark:text-white/50">No theme tags yet.</p>
              ) : (
                <div className="space-y-2">
                  {themes.map(([t, n]) => (
                    <BarRow key={t} label={t} value={n} max={maxTheme} colorClass="bg-sky-400 dark:bg-sky-500" />
                  ))}
                </div>
              )}
              {competitors.length > 0 && (
                <div className="pt-2">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
                    Tools used alongside us
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {competitors.map(([c, n]) => (
                      <Badge key={c} className="bg-black/5 dark:bg-white/10">
                        {c} · {n}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Blockers */}
          {blockers.length > 0 && (
            <Card className="space-y-2">
              <h2 className="text-sm font-semibold">Blockers ({blockers.length})</h2>
              <ul className="space-y-1.5 text-sm">
                {blockers.map((b, i) => (
                  <li key={i}>
                    {b.text}{" "}
                    <Link href={`/people/${b.personId}`} className="text-xs text-black/50 hover:underline dark:text-white/50">
                      — {b.person}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Segment coverage */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Segment coverage</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                    <th className="py-1 pr-3">Segment</th>
                    <th className="py-1 pr-3">Objective</th>
                    <th className="py-1 pr-3 text-right">Tracked</th>
                    <th className="py-1 pr-3 text-right">Contacted</th>
                  </tr>
                </thead>
                <tbody>
                  {SEGMENT_ORDER.filter((s) => (totalBySegment[s] ?? 0) > 0).map((s) => (
                    <tr key={s} className="border-t border-black/5 dark:border-white/5">
                      <td className="py-1.5 pr-3">
                        {s} · {SEGMENTS[s].name}
                        {SEGMENTS[s].highValue && " ★"}
                      </td>
                      <td className="py-1.5 pr-3">
                        <Badge className={OBJECTIVE_BADGE[SEGMENTS[s].leadObjective]}>
                          {OBJECTIVE_LABELS[SEGMENTS[s].leadObjective]}
                        </Badge>
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{totalBySegment[s] ?? 0}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">
                        {contactedBySegment[s] ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Objective mix */}
          <Card className="space-y-2">
            <h2 className="mb-1 text-sm font-semibold">Outreach by objective</h2>
            {(Object.entries(objectives) as [Objective, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([o, n]) => (
                <BarRow
                  key={o}
                  label={OBJECTIVE_LABELS[o]}
                  value={n}
                  max={Math.max(...Object.values(objectives))}
                  colorClass="bg-slate-400 dark:bg-slate-500"
                />
              ))}
          </Card>
        </div>
      )}
    </div>
  );
}
