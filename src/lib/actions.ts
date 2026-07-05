"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SEGMENTS } from "@/lib/segments";
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
  const email = str(formData.get("email"));
  const segment = str(formData.get("segment")) as Segment | null;

  if (!name || !email || !segment) {
    throw new Error("Name, email and segment are required.");
  }

  const tier = SEGMENTS[segment].tier as Tier;
  const leadObjective = SEGMENTS[segment].leadObjective;

  const person = await prisma.person.create({
    data: {
      name,
      email,
      tier,
      segment,
      leadObjective,
      activitySignal: str(formData.get("activitySignal")),
      notes: str(formData.get("notes")),
    },
  });

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
