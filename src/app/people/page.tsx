import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SEGMENTS } from "@/lib/segments";
import { Badge, Card, PageHeader, ButtonLink, EmptyState } from "@/components/ui";
import { OBJECTIVE_BADGE, OBJECTIVE_LABELS, TIER_LABELS } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const people = await prisma.person.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      outreaches: { orderBy: { occurredAt: "desc" }, take: 1 },
      _count: { select: { outreaches: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="People"
        subtitle={`${people.length} contact${people.length === 1 ? "" : "s"} tracked`}
        action={<ButtonLink href="/people/new">+ Add person</ButtonLink>}
      />

      {people.length === 0 ? (
        <EmptyState
          title="No people yet."
          hint="Add someone flagged in the weekly PostHog review — or, in v1, they'll sync in automatically."
        />
      ) : (
        <Card className="divide-y divide-black/5 p-0 dark:divide-white/5">
          {people.map((p) => {
            const last = p.outreaches[0];
            return (
              <Link
                key={p.id}
                href={`/people/${p.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{p.name}</span>
                    {SEGMENTS[p.segment].highValue && <span title="High-value segment">★</span>}
                    <span className="text-xs text-black/40 dark:text-white/40">
                      {TIER_LABELS[p.tier]}
                    </span>
                  </div>
                  <span className="text-xs text-black/50 dark:text-white/50">
                    {p.segment} · {SEGMENTS[p.segment].name} · {p.email}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-black/50 dark:text-white/50">
                    {p._count.outreaches === 0
                      ? "No touches"
                      : `${p._count.outreaches} touch${p._count.outreaches === 1 ? "" : "es"} · last ${last?.occurredAt.toLocaleDateString()}`}
                  </span>
                  <Badge className={OBJECTIVE_BADGE[p.leadObjective]}>
                    {OBJECTIVE_LABELS[p.leadObjective]}
                  </Badge>
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
