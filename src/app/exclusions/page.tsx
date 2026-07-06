import { prisma } from "@/lib/prisma";
import { addExclusion, removeExclusion } from "@/lib/actions";
import { DEFAULT_EXCLUDED_DOMAINS } from "@/lib/exclusions";
import { Card, PageHeader, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

const field = "rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5";

const KIND_LABEL: Record<string, string> = {
  DOMAIN: "Domain",
  EMAIL: "Email",
  PHONE: "Phone",
};

export default async function ExclusionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const rows = await prisma.excludedContact.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Exclusions"
        subtitle="Internal staff and anyone who should never be synced or logged as a customer."
      />

      {error === "missing" && (
        <div className="mb-4 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          Pick a type and enter a value.
        </div>
      )}

      <Card className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">Always excluded</h2>
        <p className="mb-2 text-sm text-black/60 dark:text-white/60">
          Every email at these domains is skipped by the PostHog sync and the call webhook.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_EXCLUDED_DOMAINS.map((d) => (
            <Badge key={d} className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              @{d}
            </Badge>
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">Add an exclusion</h2>
        <p className="mb-3 text-sm text-black/60 dark:text-white/60">
          Use <strong>Email</strong> for a staff member&apos;s personal address (e.g. their Gmail),
          <strong> Domain</strong> for another company domain, or <strong>Phone</strong> for a number.
        </p>
        <form action={addExclusion} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium">Type</label>
            <select name="kind" className={field} defaultValue="EMAIL">
              <option value="EMAIL">Email</option>
              <option value="DOMAIN">Domain</option>
              <option value="PHONE">Phone</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium">Value</label>
            <input name="value" required className={`${field} w-full`} placeholder="person@gmail.com / example.com / +97150…" />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium">Note <span className="font-normal text-black/40">(optional)</span></label>
            <input name="note" className={`${field} w-full`} placeholder="e.g. Ahmed (engineering)" />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-white/80"
          >
            Add
          </button>
        </form>
      </Card>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
        Custom exclusions ({rows.length})
      </h2>
      {rows.length === 0 ? (
        <Card className="text-sm text-black/50 dark:text-white/50">
          None yet. The @smart-bricks.com domain above is already covered.
        </Card>
      ) : (
        <Card className="divide-y divide-black/5 p-0 dark:divide-white/5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  {KIND_LABEL[r.kind]}
                </Badge>
                <span className="font-medium">{r.kind === "DOMAIN" ? `@${r.value}` : r.value}</span>
                {r.note && <span className="text-xs text-black/50 dark:text-white/50">{r.note}</span>}
              </div>
              <form action={removeExclusion}>
                <input type="hidden" name="id" value={r.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                >
                  Remove
                </button>
              </form>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
