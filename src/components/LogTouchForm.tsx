"use client";

import { useMemo, useState } from "react";
import { createOutreach } from "@/lib/actions";
import { Card } from "@/components/ui";
import {
  CHANNEL_LABELS,
  STATUS_LABELS,
  OUTCOME_LABELS,
  INCENTIVE_LABELS,
  INCENTIVE_STATUS_LABELS,
  CALL_TIER_LABELS,
  options,
} from "@/lib/labels";

export type PersonOption = {
  id: string;
  name: string;
  segment: string;
  segmentName: string;
  questions: string[];
  suggestedIncentive: string;
};

const field =
  "block w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5";
const label = "mb-1 block text-sm font-medium";

export default function LogTouchForm({
  people,
  defaultPersonId,
}: {
  people: PersonOption[];
  defaultPersonId?: string;
}) {
  const [personId, setPersonId] = useState(defaultPersonId ?? "");
  const [channel, setChannel] = useState("CALL");
  const [showFeedback, setShowFeedback] = useState(false);

  const person = useMemo(() => people.find((p) => p.id === personId), [people, personId]);

  return (
    <Card>
      <form action={createOutreach} className="space-y-5">
        {/* --- Who + how --- */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="personId">Person</label>
            <select
              id="personId"
              name="personId"
              required
              className={field}
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
            >
              <option value="" disabled>Select a person…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.segment} · {p.segmentName}
                </option>
              ))}
            </select>
            {person && (
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                Suggested incentive: {person.suggestedIncentive}
              </p>
            )}
          </div>

          <div>
            <label className={label} htmlFor="channel">Channel</label>
            <select
              id="channel"
              name="channel"
              className={field}
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              {options(CHANNEL_LABELS).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {channel === "CALL" && (
            <div>
              <label className={label} htmlFor="callTier">Call tier</label>
              <select id="callTier" name="callTier" className={field} defaultValue="TIER_1">
                {options(CALL_TIER_LABELS).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={label} htmlFor="owner">Owner</label>
            <input id="owner" name="owner" required className={field} placeholder="Justin" defaultValue="Justin" />
          </div>

          <div>
            <label className={label} htmlFor="attempts">Attempts</label>
            <input id="attempts" name="attempts" type="number" min={1} defaultValue={1} className={field} />
          </div>

          <div>
            <label className={label} htmlFor="status">Status</label>
            <select id="status" name="status" className={field} defaultValue="REACHED">
              {options(STATUS_LABELS).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={label} htmlFor="outcome">Outcome</label>
            <select id="outcome" name="outcome" className={field} defaultValue="">
              <option value="">—</option>
              {options(OUTCOME_LABELS).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* --- Incentive --- */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="incentiveType">Incentive offered</label>
            <select id="incentiveType" name="incentiveType" className={field} defaultValue="NONE">
              {options(INCENTIVE_LABELS).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="incentiveStatus">Incentive status</label>
            <select id="incentiveStatus" name="incentiveStatus" className={field} defaultValue="NOT_OFFERED">
              {options(INCENTIVE_STATUS_LABELS).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={label} htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={2} className={field} placeholder="What happened on this touch?" />
        </div>

        {/* --- Next action --- */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="nextAction">Next action</label>
            <input id="nextAction" name="nextAction" className={field} placeholder="e.g. Send Rent Optimizer link" />
          </div>
          <div>
            <label className={label} htmlFor="nextActionDueAt">Due date</label>
            <input id="nextActionDueAt" name="nextActionDueAt" type="date" className={field} />
          </div>
        </div>

        {/* --- Feedback (collapsible) --- */}
        <div className="rounded-lg border border-dashed border-black/15 p-4 dark:border-white/15">
          <button
            type="button"
            onClick={() => setShowFeedback((v) => !v)}
            className="text-sm font-medium"
          >
            {showFeedback ? "▾" : "▸"} Capture feedback {showFeedback ? "" : "(optional)"}
          </button>

          {showFeedback && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={label} htmlFor="npsScore">NPS (0–10)</label>
                  <input id="npsScore" name="npsScore" type="number" min={0} max={10} className={field} />
                </div>
                <div>
                  <label className={label} htmlFor="competitorTool">Tool used alongside</label>
                  <input id="competitorTool" name="competitorTool" className={field} placeholder="Property Finder, Bayut…" />
                </div>
              </div>
              <div>
                <label className={label} htmlFor="blocker">Blocker</label>
                <input id="blocker" name="blocker" className={field} placeholder="What's stopping them?" />
              </div>
              <div>
                <label className={label} htmlFor="featureRequest">Feature request</label>
                <input id="featureRequest" name="featureRequest" className={field} />
              </div>
              <div>
                <label className={label} htmlFor="quote">Verbatim quote</label>
                <textarea id="quote" name="quote" rows={2} className={field} />
              </div>
              <div>
                <label className={label} htmlFor="themeTags">Roadmap theme tags <span className="font-normal text-black/40">(comma-separated)</span></label>
                <input id="themeTags" name="themeTags" className={field} placeholder="pricing, onboarding, rent-tool" />
              </div>

              {/* Segment-specific questions, pre-loaded from the brief */}
              {person && person.questions.length > 0 && (
                <div className="space-y-3 rounded-lg bg-black/5 p-3 dark:bg-white/5">
                  <p className="text-sm font-medium">
                    {person.segment} questions — {person.segmentName}
                  </p>
                  {person.questions.map((q, i) => (
                    <div key={i}>
                      <label className="mb-1 block text-xs text-black/60 dark:text-white/60">{q}</label>
                      <textarea name={`q:${q}`} rows={2} className={field} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-white/80"
        >
          Save touch
        </button>
      </form>
    </Card>
  );
}
