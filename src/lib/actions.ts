"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SEGMENTS } from "@/lib/segments";
import { runSync, type SyncSummary } from "@/lib/sync";
import { posthogConfigured } from "@/lib/posthog";
import { extractFeedback, anthropicConfigured, type ExtractedFeedback } from "@/lib/extract";
import type {
  Segment,
  Tier,
  Channel,
  CallTier,
  OutreachStatus,
  Outcome,
  IncentiveType,
  IncentiveStatus,
} from "@/generated/prisma/enums";

function str(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

// --- People --------------------------------------------------------------

export async function createPerson(formData: FormData) {
  const name = str(formData.get("name"));
  const email = str(formData.get("email"))?.toLowerCase() ?? null;
  const segment = str(formData.get("segment")) as Segment | null;

  if (!name || !email || !segment) {
    redirect("/people/new?error=missing");
  }

  const tier = SEGMENTS[segment].tier as Tier;
  const leadObjective = SEGMENTS[segment].leadObjective;

  const phoneRaw = str(formData.get("phone"));
  const phone = phoneRaw ? phoneRaw.replace(/\D/g, "") || null : null;

  let person;
  try {
    person = await prisma.person.create({
      data: {
        name,
        email,
        phone,
        tier,
        segment,
        leadObjective,
        activitySignal: str(formData.get("activitySignal")),
        notes: str(formData.get("notes")),
      },
    });
  } catch (e) {
    // Duplicate email — surface a friendly message instead of a 500.
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      const existing = await prisma.person.findUnique({ where: { email }, select: { id: true } });
      if (existing) redirect(`/people/${existing.id}?exists=1`);
      redirect("/people/new?error=email");
    }
    throw e;
  }

  revalidatePath("/people");
  redirect(`/people/${person.id}`);
}

// --- Outreach ------------------------------------------------------------

export async function createOutreach(formData: FormData) {
  const personId = str(formData.get("personId"));
  const channel = str(formData.get("channel")) as Channel | null;
  const owner = str(formData.get("owner"));
  const status = (str(formData.get("status")) ?? "REACHED") as OutreachStatus;

  if (!personId || !channel || !owner) {
    throw new Error("Person, channel and owner are required.");
  }

  const outcome = str(formData.get("outcome")) as Outcome | null;
  const callTier = str(formData.get("callTier")) as CallTier | null;
  const nextActionDue = str(formData.get("nextActionDueAt"));

  // Optional feedback block — only created if any field was filled in.
  const npsRaw = str(formData.get("npsScore"));
  const npsScore = npsRaw !== null ? Number(npsRaw) : null;
  const blocker = str(formData.get("blocker"));
  const featureRequest = str(formData.get("featureRequest"));
  const competitorTool = str(formData.get("competitorTool"));
  const quote = str(formData.get("quote"));
  const themeTagsRaw = str(formData.get("themeTags"));
  const themeTags = themeTagsRaw
    ? themeTagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  // Collect per-question answers (fields named "q:<question>").
  const responses: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("q:") && typeof value === "string" && value.trim()) {
      responses[key.slice(2)] = value.trim();
    }
  }

  const hasFeedback =
    npsScore !== null ||
    blocker ||
    featureRequest ||
    competitorTool ||
    quote ||
    themeTags.length > 0 ||
    Object.keys(responses).length > 0;

  await prisma.outreach.create({
    data: {
      personId,
      channel,
      callTier: channel === "CALL" ? callTier : null,
      owner,
      attempts: Number(str(formData.get("attempts")) ?? "1") || 1,
      status,
      outcome,
      incentiveType: (str(formData.get("incentiveType")) ?? "NONE") as IncentiveType,
      incentiveStatus: (str(formData.get("incentiveStatus")) ?? "NOT_OFFERED") as IncentiveStatus,
      nextAction: str(formData.get("nextAction")),
      nextActionDueAt: nextActionDue ? new Date(nextActionDue) : null,
      notes: str(formData.get("notes")),
      transcript: str(formData.get("transcript")),
      aiSummary: str(formData.get("aiSummary")),
      feedback: hasFeedback
        ? {
            create: {
              npsScore: npsScore !== null && !Number.isNaN(npsScore) ? npsScore : null,
              blocker,
              featureRequest,
              competitorTool,
              quote,
              themeTags,
              responses: Object.keys(responses).length ? responses : undefined,
            },
          }
        : undefined,
    },
  });

  revalidatePath("/");
  revalidatePath("/outreach");
  revalidatePath(`/people/${personId}`);
  redirect(`/people/${personId}`);
}

// --- PostHog sync (v1) ---------------------------------------------------

export type SyncActionState =
  | { ok: true; summary: SyncSummary }
  | { ok: false; error: string }
  | null;

export async function syncFromPostHog(_prev: SyncActionState): Promise<SyncActionState> {
  if (!posthogConfigured()) {
    return {
      ok: false,
      error:
        "PostHog isn't configured. Set POSTHOG_API_KEY and POSTHOG_PROJECT_ID in the environment, then try again.",
    };
  }

  try {
    const summary = await runSync();
    revalidatePath("/");
    revalidatePath("/people");
    revalidatePath("/sync");
    return { ok: true, summary };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// --- AI call-transcript extraction (v3) ---------------------------------

export type ExtractActionResult =
  | { ok: true; data: ExtractedFeedback }
  | { ok: false; error: string };

export async function extractCallFeedback(
  segment: Segment,
  transcript: string,
): Promise<ExtractActionResult> {
  if (!anthropicConfigured()) {
    return {
      ok: false,
      error: "AI extraction isn't configured. Set ANTHROPIC_API_KEY in the environment.",
    };
  }
  const text = transcript.trim();
  if (text.length < 20) {
    return { ok: false, error: "Paste a longer transcript before extracting." };
  }
  try {
    const data = await extractFeedback(text, segment);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// --- Unmatched calls (webhook ingestion) ---------------------------------

// Mark an unmatched call as handled (dismiss it from the queue).
export async function dismissUnmatchedCall(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) throw new Error("id is required.");
  await prisma.unmatchedCall.update({ where: { id }, data: { handled: true } });
  revalidatePath("/calls");
}

export async function updateOutreachStatus(formData: FormData) {
  const id = str(formData.get("id"));
  const status = str(formData.get("status")) as OutreachStatus | null;
  const personId = str(formData.get("personId"));
  if (!id || !status) throw new Error("Outreach id and status are required.");

  await prisma.outreach.update({ where: { id }, data: { status } });

  revalidatePath("/");
  revalidatePath("/outreach");
  if (personId) revalidatePath(`/people/${personId}`);
}
