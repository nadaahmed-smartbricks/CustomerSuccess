import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SEGMENTS } from "@/lib/segments";
import { Badge, Card, Stat, PageHeader, ButtonLink, EmptyState } from "@/components/ui";
import { CHANNEL_ICONS, STATUS_BADGE, STATUS_LABELS, OBJECTIVE_BADGE, OBJECTIVE_LABELS } from "@/lib/labels";

export const dynamic = "force-dynamic";

function since(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export default async function Dashboard() {
  const weekAgo = since(7);

  const [peopleCount, touchesThisWeek, feedbackAgg, needsFirstTouch, dueFollowUps, recent] =
    await Promise.all([
      prisma.person.count(),
      prisma.outreach.count({ where: { occurredAt: { gte: weekAgo } } }),
      prisma.feedback.aggregate({ _avg: { npsScore: true }, _count: { _all: true } }),
      prisma.person.findMany({
        where: { outreaches: { none: {} } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.outreach.findMany({
        where: { status: { not: "DONE" }, nextActionDueAt: { not: null } },
        orderBy: { nextActionDueAt: "asc" },
        take: 8,
        include: { person: true },
      }),
      prisma.outreach.findMany({
        orderBy: { occurredAt: "desc" },
        take: 8,
        include: { person: true, feedback: true },
      }),
    ]);

  const avgNps = feedbackAgg._avg.npsScore;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="The weekly Product ⇄ Sales check-in, in one place."
        action={<ButtonLink href="/outreach/new">+ Log a touch</ButtonLink>}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="People tracked" value={peopleCount} />
        <Stat label="Touches this week" value={touchesThisWeek} hint="last 7 days" />
        <Stat label="Feedback captured" value={feedbackAgg._count._all} />
        <Stat label="Avg NPS" value={avgNps != null ? avgNps.toFixed(1) : "—"} hint="0–10" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
            Needs a first touch
          </h2>
          {needsFirstTouch.length === 0 ? (
            <EmptyState title="Everyone tracked has been contacted." hint="Add people from the People tab." />
          ) : (
            <Card className="divide-y divide-black/5 p-0 dark:divide-white/5">
              {needsFirstTouch.map((p) => (
                <Link
                  key={p.id}
                  href={`/people/${p.id}`}
                  className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{p.name}</span>
                      {SEGMENTS[p.segment].highValue && <span title="High-value segment">★</span>}
                    </div>
                    <span className="text-xs text-black/50 dark:text-white/50">
                      {p.segment} · {SEGMENTS[p.segment].name}
                      {p.activitySignal ? ` · ${p.activitySignal}` : ""}
                    </span>
                  </div>
                  <Badge className={OBJECTIVE_BADGE[p.leadObjective]}>
                    {OBJECTIVE_LABELS[p.leadObjective]}
                  </Badge>
                </Link>
              ))}
            </Card>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
            Follow-ups due
          </h2>
          {dueFollowUps.length === 0 ? (
            <EmptyState title="No follow-ups scheduled." />
          ) : (
            <Card className="divide-y divide-black/5 p-0 dark:divide-white/5">
              {dueFollowUps.map((o) => (
                <Link
                  key={o.id}
                  href={`/people/${o.personId}`}
                  className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <span className="truncate font-medium">{o.person.name}</span>
                    <p className="truncate text-xs text-black/50 dark:text-white/50">
                      {o.nextAction ?? "Follow up"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-black/50 dark:text-white/50">
                    {o.nextActionDueAt?.toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </Card>
          )}
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
            Recent activity
          </h2>
          <Link href="/outreach" className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState title="No outreach logged yet." hint="Log your first touch to get started." />
        ) : (
          <Card className="divide-y divide-black/5 p-0 dark:divide-white/5">
            {recent.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-lg" aria-hidden>{CHANNEL_ICONS[o.channel]}</span>
                  <div className="min-w-0">
                    <Link href={`/people/${o.personId}`} className="truncate font-medium hover:underline">
                      {o.person.name}
                    </Link>
                    <p className="text-xs text-black/50 dark:text-white/50">
                      {o.owner} · {o.occurredAt.toLocaleDateString()}
                      {o.feedback?.npsScore != null ? ` · NPS ${o.feedback.npsScore}` : ""}
                    </p>
                  </div>
                </div>
                <Badge className={STATUS_BADGE[o.status]}>{STATUS_LABELS[o.status]}</Badge>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
