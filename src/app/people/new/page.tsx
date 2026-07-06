import { createPerson } from "@/lib/actions";
import { SEGMENTS, SEGMENT_ORDER } from "@/lib/segments";
import { Card, PageHeader } from "@/components/ui";
import { OBJECTIVE_LABELS } from "@/lib/labels";

export const dynamic = "force-dynamic";

const field = "block w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5";
const label = "mb-1 block text-sm font-medium";

export default async function NewPersonPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; email?: string; phone?: string; error?: string }>;
}) {
  const prefill = await searchParams;
  const errorMsg =
    prefill.error === "email"
      ? "That email is already tracked. Use a different email, or find the person on the People page."
      : prefill.error === "missing"
        ? "Name, email and segment are all required."
        : null;
  return (
    <div className="max-w-xl">
      <PageHeader title="Add person" subtitle="Someone flagged for outreach in the weekly review." />
      {errorMsg && (
        <div className="mb-4 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {errorMsg}
        </div>
      )}
      <Card>
        <form action={createPerson} className="space-y-4">
          <div>
            <label className={label} htmlFor="name">Name</label>
            <input id="name" name="name" required className={field} placeholder="Full name" defaultValue={prefill.name ?? ""} />
          </div>
          <div>
            <label className={label} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className={field} placeholder="name@example.com" defaultValue={prefill.email ?? ""} />
          </div>
          <div>
            <label className={label} htmlFor="phone">Phone <span className="font-normal text-black/40">(optional — lets call transcripts auto-match)</span></label>
            <input id="phone" name="phone" type="tel" className={field} placeholder="+971 50 123 4567" defaultValue={prefill.phone ?? ""} />
          </div>
          <div>
            <label className={label} htmlFor="segment">Segment</label>
            <select id="segment" name="segment" required className={field} defaultValue="">
              <option value="" disabled>Select a segment…</option>
              {SEGMENT_ORDER.map((code) => {
                const s = SEGMENTS[code];
                return (
                  <option key={code} value={code}>
                    {code} · {s.name} ({s.tier}) — {OBJECTIVE_LABELS[s.leadObjective]}
                    {s.highValue ? " ★" : ""}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">
              Tier and lead objective are set automatically from the segment.
            </p>
          </div>
          <div>
            <label className={label} htmlFor="activitySignal">Activity signal <span className="font-normal text-black/40">(optional)</span></label>
            <input id="activitySignal" name="activitySignal" className={field} placeholder="e.g. Hit advisor limit in last 30 days" />
          </div>
          <div>
            <label className={label} htmlFor="notes">Notes <span className="font-normal text-black/40">(optional)</span></label>
            <textarea id="notes" name="notes" rows={3} className={field} />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-white/80"
          >
            Add person
          </button>
        </form>
      </Card>
    </div>
  );
}
