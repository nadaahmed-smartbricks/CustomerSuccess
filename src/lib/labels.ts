// Human-readable labels and Tailwind color classes for the enum values,
// so the DB stays in clean SCREAMING_CASE while the UI reads naturally.

import type {
  Channel,
  Objective,
  OutreachStatus,
  Outcome,
  IncentiveType,
  IncentiveStatus,
  CallTier,
  Tier,
} from "@/generated/prisma/enums";

export const CHANNEL_LABELS: Record<Channel, string> = {
  CALL: "Call",
  IN_PERSON: "In person",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
};

export const CHANNEL_ICONS: Record<Channel, string> = {
  CALL: "📞",
  IN_PERSON: "🤝",
  WHATSAPP: "💬",
  EMAIL: "✉️",
};

export const OBJECTIVE_LABELS: Record<Objective, string> = {
  CONVERT: "Convert to Pro",
  REENGAGE: "Re-engagement",
  FEEDBACK: "Feedback & Advocacy",
};

export const OBJECTIVE_BADGE: Record<Objective, string> = {
  CONVERT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  REENGAGE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  FEEDBACK: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
};

export const STATUS_LABELS: Record<OutreachStatus, string> = {
  TO_CONTACT: "To contact",
  ATTEMPTED: "Attempted",
  REACHED: "Reached",
  NO_RESPONSE: "No response",
  DECLINED: "Declined",
  DONE: "Done",
};

export const STATUS_BADGE: Record<OutreachStatus, string> = {
  TO_CONTACT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  ATTEMPTED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  REACHED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  NO_RESPONSE: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  DECLINED: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  DONE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export const OUTCOME_LABELS: Record<Outcome, string> = {
  CONVERTED: "Converted 🎉",
  FOLLOW_UP_SCHEDULED: "Follow-up scheduled",
  GAVE_FEEDBACK: "Gave feedback",
  NOT_INTERESTED: "Not interested",
  FEATURE_REQUESTED: "Feature requested",
  NO_ANSWER_YET: "No answer yet",
};

export const INCENTIVE_LABELS: Record<IncentiveType, string> = {
  NONE: "None",
  AMAZON_VOUCHER: "Amazon.ae voucher",
  NOON_VOUCHER: "Noon voucher",
  PRO_TRIAL: "Pro trial",
  EARLY_ACCESS: "Early access",
  MARKET_REPORT: "Market report",
};

export const INCENTIVE_STATUS_LABELS: Record<IncentiveStatus, string> = {
  NOT_OFFERED: "Not offered",
  OFFERED: "Offered",
  SENT: "Sent",
};

export const CALL_TIER_LABELS: Record<CallTier, string> = {
  TIER_1: "Tier 1 — Light touch",
  TIER_2: "Tier 2 — Mid-detail",
  TIER_3: "Tier 3 — Detailed",
};

export const TIER_LABELS: Record<Tier, string> = {
  FREE: "Free",
  PRO: "Pro",
};

// Convenience list for building <select> options from a label map.
export function options<T extends string>(map: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value] }));
}
