// Ingests a call transcript delivered by a webhook: match it to a Person, create
// the logged outreach, and (asynchronously) run the AI feedback extraction.
// Provider-agnostic — a per-provider adapter normalizes the payload into TranscriptPayload.

import { prisma } from "@/lib/prisma";
import { SEGMENTS } from "@/lib/segments";
import { extractFeedback, anthropicConfigured } from "@/lib/extract";
import { loadExclusions, isExcluded } from "@/lib/exclusions";
import { Outcome } from "@/generated/prisma/enums";
import type { CallTier, Segment } from "@/generated/prisma/enums";

export type TranscriptPayload = {
  transcript: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  owner?: string | null;
  occurredAt?: string | null; // ISO
  callTier?: CallTier | null;
  provider?: string | null;
  externalId?: string | null;
};

/** Digits only, so "+971 50 123 4567" and "0501234567" compare consistently. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length ? digits : null;
}

const VALID_OUTCOMES = new Set<string>(Object.values(Outcome));

async function matchPerson(email?: string | null, phone?: string | null) {
  const e = email?.trim().toLowerCase();
  if (e) {
    const byEmail = await prisma.person.findUnique({ where: { email: e } });
    if (byEmail) return byEmail;
  }
  const p = normalizePhone(phone);
  if (p) {
    // Match on the last 9 digits to tolerate country-code / leading-zero differences.
    const byPhone = await prisma.person.findFirst({
      where: { phone: { endsWith: p.slice(-9) } },
    });
    if (byPhone) return byPhone;
  }
  return null;
}

export type IngestResult =
  | { kind: "matched"; personId: string; outreachId: string; extract: () => Promise<void> }
  | { kind: "unmatched"; unmatchedCallId: string; extract: () => Promise<void> }
  | { kind: "excluded" };

/**
 * Synchronously records the call, and returns an `extract()` closure the caller
 * runs after responding (via `after()`) so the webhook returns fast.
 */
export async function ingestTranscript(payload: TranscriptPayload): Promise<IngestResult> {
  const transcript = payload.transcript.trim();
  const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : new Date();

  // Never record calls for internal staff / excluded contacts.
  const exclusions = await loadExclusions();
  if (isExcluded(payload.email, payload.phone, exclusions)) {
    return { kind: "excluded" };
  }

  const person = await matchPerson(payload.email, payload.phone);

  if (person) {
    const outreach = await prisma.outreach.create({
      data: {
        personId: person.id,
        channel: "CALL",
        callTier: payload.callTier ?? null,
        owner: payload.owner?.trim() || "Justin",
        occurredAt,
        status: "REACHED",
        transcript,
      },
    });
    const segment = person.segment as Segment;
    return {
      kind: "matched",
      personId: person.id,
      outreachId: outreach.id,
      extract: () => applyExtractionToOutreach(outreach.id, transcript, segment),
    };
  }

  const unmatched = await prisma.unmatchedCall.create({
    data: {
      transcript,
      occurredAt,
      name: payload.name ?? null,
      email: payload.email ?? null,
      phone: normalizePhone(payload.phone),
      provider: payload.provider ?? null,
      externalId: payload.externalId ?? null,
    },
  });
  return {
    kind: "unmatched",
    unmatchedCallId: unmatched.id,
    extract: () => summarizeUnmatched(unmatched.id, transcript),
  };
}

/**
 * Log a transcript against a person we already know (e.g. an uploaded recording),
 * and return the outreach id + an extract() closure to run after responding.
 */
export async function logCallTranscript(
  personId: string,
  transcript: string,
  owner?: string | null,
): Promise<{ outreachId: string; extract: () => Promise<void> }> {
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) throw new Error("Person not found.");
  const outreach = await prisma.outreach.create({
    data: {
      personId,
      channel: "CALL",
      owner: owner?.trim() || "Justin",
      status: "REACHED",
      transcript: transcript.trim(),
    },
  });
  const segment = person.segment as Segment;
  return {
    outreachId: outreach.id,
    extract: () => applyExtractionToOutreach(outreach.id, transcript.trim(), segment),
  };
}

export async function applyExtractionToOutreach(outreachId: string, transcript: string, segment: Segment) {
  if (!anthropicConfigured()) return;
  const d = await extractFeedback(transcript, segment);

  const outcome = d.outcome && VALID_OUTCOMES.has(d.outcome) ? (d.outcome as Outcome) : null;
  const responses = Object.fromEntries(d.responses.map((r) => [r.question, r.answer]));
  const hasFeedback =
    d.npsScore != null || d.blocker || d.featureRequest || d.competitorTool || d.quote ||
    d.themeTags.length > 0 || Object.keys(responses).length > 0;

  await prisma.outreach.update({
    where: { id: outreachId },
    data: {
      aiSummary: d.summary || null,
      outcome: outcome ?? undefined,
      feedback: hasFeedback
        ? {
            create: {
              npsScore: d.npsScore ?? null,
              blocker: d.blocker,
              featureRequest: d.featureRequest,
              competitorTool: d.competitorTool,
              quote: d.quote,
              themeTags: d.themeTags,
              responses: Object.keys(responses).length ? responses : undefined,
            },
          }
        : undefined,
    },
  });
}

async function summarizeUnmatched(id: string, transcript: string) {
  if (!anthropicConfigured()) return;
  // No segment context for an unknown caller — use the general Advisor-Curious question set
  // just to get a useful summary; a human assigns the real segment later.
  const d = await extractFeedback(transcript, "F1" as Segment);
  await prisma.unmatchedCall.update({ where: { id }, data: { aiSummary: d.summary || null } });
}
