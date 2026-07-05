// The v1 sync: run each segment's HogQL against PostHog, then upsert the matching
// people into the tracker. People who match several segments are assigned their
// highest-priority (most actionable) segment via SYNC_PRIORITY.

import { prisma } from "@/lib/prisma";
import { runHogQL } from "@/lib/posthog";
import { SEGMENTS } from "@/lib/segments";
import { SEGMENT_QUERIES, SYNC_PRIORITY } from "@/lib/segment-queries";
import type { Segment, Tier } from "@/generated/prisma/enums";

export type SegmentSyncResult = {
  segment: Segment;
  name: string;
  matched: number; // rows returned by the query
  created: number; // new people added
  updated: number; // existing people re-tagged
  error?: string;
};

export type SyncSummary = {
  results: SegmentSyncResult[];
  totalCreated: number;
  totalUpdated: number;
};

export async function runSync(): Promise<SyncSummary> {
  const claimed = new Set<string>(); // emails already assigned this run (priority wins)
  const results: SegmentSyncResult[] = [];

  for (const segment of SYNC_PRIORITY) {
    const info = SEGMENTS[segment];
    const { sql, signal } = SEGMENT_QUERIES[segment];

    let rows;
    try {
      rows = await runHogQL(sql);
    } catch (e) {
      results.push({
        segment,
        name: info.name,
        matched: 0,
        created: 0,
        updated: 0,
        error: e instanceof Error ? e.message : String(e),
      });
      continue;
    }

    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const email = String(row.email ?? "").trim().toLowerCase();
      if (!email || claimed.has(email)) continue;
      claimed.add(email);

      const name = (row.name ? String(row.name) : "").trim() || email;
      const personId = row.person_id ? String(row.person_id) : null;

      const existing = await prisma.person.findUnique({ where: { email }, select: { id: true } });
      await prisma.person.upsert({
        where: { email },
        create: {
          email,
          name,
          tier: info.tier as Tier,
          segment,
          leadObjective: info.leadObjective,
          activitySignal: signal,
          posthogDistinctId: personId,
        },
        // Re-tag existing people, but never clobber their manually-entered notes or outreach history.
        update: {
          tier: info.tier as Tier,
          segment,
          leadObjective: info.leadObjective,
          activitySignal: signal,
        },
      });
      if (existing) updated++;
      else created++;
    }

    results.push({ segment, name: info.name, matched: rows.length, created, updated });
  }

  return {
    results,
    totalCreated: results.reduce((s, r) => s + r.created, 0),
    totalUpdated: results.reduce((s, r) => s + r.updated, 0),
  };
}
