import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SEGMENTS } from "@/lib/segments";
import { PageHeader, EmptyState, ButtonLink } from "@/components/ui";
import LogTouchForm, { type PersonOption } from "@/components/LogTouchForm";

export const dynamic = "force-dynamic";

export default async function NewOutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ personId?: string }>;
}) {
  const { personId } = await searchParams;

  const people = await prisma.person.findMany({ orderBy: { name: "asc" } });

  const options: PersonOption[] = people.map((p) => ({
    id: p.id,
    name: p.name,
    segment: p.segment,
    segmentName: SEGMENTS[p.segment].name,
    questions: SEGMENTS[p.segment].questions,
    suggestedIncentive: SEGMENTS[p.segment].suggestedIncentive,
  }));

  return (
    <div className="max-w-2xl">
      <PageHeader title="Log a touch" subtitle="Record an outreach and any feedback captured." />
      {options.length === 0 ? (
        <EmptyState
          title="Add a person first."
          hint="You need at least one contact before logging a touch."
        />
      ) : (
        <LogTouchForm people={options} defaultPersonId={personId} />
      )}
      <div className="mt-4">
        {options.length === 0 ? (
          <ButtonLink href="/people/new">+ Add person</ButtonLink>
        ) : (
          <Link href="/" className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white">
            ← Back to dashboard
          </Link>
        )}
      </div>
    </div>
  );
}
