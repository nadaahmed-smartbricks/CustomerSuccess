import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SEGMENTS } from "@/lib/segments";
import { Badge, Card, PageHeader, ButtonLink, EmptyState } from "@/components/ui";
import {
  CHANNEL_ICONS,
  CHANNEL_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
  OUTCOME_LABELS,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function OutreachLogPage() {
  const outreaches = await prisma.outreach.findMany({
    orderBy: { occurredAt: "desc" },
    include: { person: true, feedback: true },
  });

  return (
    <div>
      <PageHeader
        title="Outreach log"
        subtitle={`${outreaches.length} touch${outreaches.length === 1 ? "" : "es"} recorded`}
        action={<ButtonLink href="/outreach/new">+ Log a touch</ButtonLink>}
      />

      {outreaches.length === 0 ? (
        <EmptyState title="No outreach logged yet." hint="Log your first touch to get started." />
      ) : (
        <Card className="divide-y divide-black/5 p-0 dark:divide-white/5">
          {outreaches.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-lg" aria-hidden>{CHANNEL_ICONS[o.channel]}</span>
                <div className="min-w-0">
                  <Link href={`/people/${o.personId}`} className="font-medium hover:underline">
                    {o.person.name}
                  </Link>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    {o.person.segment} · {SEGMENTS[o.person.segment].name} · {CHANNEL_LABELS[o.channel]} · {o.owner} ·{" "}
                    {o.occurredAt.toLocaleDateString()}
                    {o.outcome ? ` · ${OUTCOME_LABELS[o.outcome]}` : ""}
                    {o.feedback?.npsScore != null ? ` · NPS ${o.feedback.npsScore}` : ""}
                  </p>
                </div>
              </div>
              <Badge className={STATUS_BADGE[o.status]}>{STATUS_LABELS[o.status]}</Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
