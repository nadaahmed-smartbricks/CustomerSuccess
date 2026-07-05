// Reference data for the 13 Smart Bricks customer segments, taken directly from the
// Customer Segmentation — Marketing Brief (June 2026). Editing this file changes the
// segment context and pre-loaded feedback questions shown in the UI — no DB migration needed.

import type { Segment, Objective } from "@/generated/prisma/enums";

export type SegmentInfo = {
  code: Segment;
  name: string;
  tier: "FREE" | "PRO";
  /** Est. size from PostHog (June 2026). */
  estSize: string;
  /** One-line definition of who is in the segment. */
  definition: string;
  /** Lead campaign objective + any that also apply. */
  leadObjective: Objective;
  alsoObjectives: Objective[];
  /** ★ high-value segments: priority for feedback and for protecting/converting. */
  highValue: boolean;
  /** The recommended next move from the brief's "Key Action" column. */
  keyAction: string;
  /** The segment's own feedback questions (empty for segments the brief doesn't script). */
  questions: string[];
  /** Default incentive to offer this segment when asking for feedback. */
  suggestedIncentive: string;
};

export const SEGMENTS: Record<Segment, SegmentInfo> = {
  F1: {
    code: "F1",
    name: "Advisor Curious",
    tier: "FREE",
    estSize: "50–80",
    definition:
      "Messaged the AI advisor 1–3 times in 30 days without hitting the limit or clicking upgrade. Got a taste of value and left.",
    leadObjective: "CONVERT",
    alsoObjectives: ["REENGAGE"],
    highValue: true,
    keyAction: "Nurture then convert",
    questions: [
      "What question did you ask the advisor, and was the answer useful?",
      "Did you know the free plan caps how many questions you can ask per month?",
      "What would you want to ask if you had unlimited access?",
      "Are you making an active property decision right now — buying, selling, or renting?",
    ],
    suggestedIncentive: "Entry into an Amazon.ae voucher draw",
  },
  F2: {
    code: "F2",
    name: "Advisor Blocked",
    tier: "FREE",
    estSize: "~37",
    definition:
      "Hit the advisor message limit in the last 30 days. Exhausted their free quota mid-research — the single highest-converting free segment.",
    leadObjective: "CONVERT",
    alsoObjectives: ["FEEDBACK"],
    highValue: true,
    keyAction: "Convert now (top intent)",
    questions: [
      "What were you trying to find out when you hit the limit?",
      "Did you find the answer elsewhere after being blocked?",
      "How useful was the advisor before you hit the limit (1–5)?",
      "Would you upgrade for unlimited advisor access alone, even without the other Pro features?",
    ],
    suggestedIncentive: "Entry into an Amazon.ae voucher draw",
  },
  F3: {
    code: "F3",
    name: "Property Starter",
    tier: "FREE",
    estSize: "40–60",
    definition:
      "Added at least one property in 30 days but barely used portfolio features and never saw an upgrade CTA.",
    leadObjective: "CONVERT",
    alsoObjectives: ["REENGAGE"],
    highValue: false,
    keyAction: "Nurture then convert",
    questions: [],
    suggestedIncentive: "None",
  },
  F4: {
    code: "F4",
    name: "Portfolio Simulator Curious",
    tier: "FREE",
    estSize: "30–50",
    definition:
      "Opened the portfolio simulator but never completed a simulation or used the Pro version — likely stopped at a paywall or unsure of the inputs.",
    leadObjective: "CONVERT",
    alsoObjectives: ["REENGAGE"],
    highValue: false,
    keyAction: "Nurture then convert",
    questions: [],
    suggestedIncentive: "None",
  },
  F5: {
    code: "F5",
    name: "Rent Optimization Aware",
    tier: "FREE",
    estSize: "10–20",
    definition:
      "Visited the rent optimization page but did not access the Pro RERA analysis. Small but high-intent (likely active landlords).",
    leadObjective: "CONVERT",
    alsoObjectives: [],
    highValue: true,
    keyAction: "Convert now + fix discovery",
    questions: [
      "Are you currently a landlord with an active tenant?",
      "What rent-related question brought you to the page?",
      "Was the legal rent ceiling for your property clear to you?",
      "Would you pay for a tool that tells you your exact legal increase under Decree 43?",
    ],
    suggestedIncentive: "Entry into an Amazon.ae voucher draw",
  },
  F6: {
    code: "F6",
    name: "Active Researcher",
    tier: "FREE",
    estSize: "50–80",
    definition:
      "Browsing heavily (5+ property views/searches in 30 days) but has used no feature and not clicked upgrade. Treating Smart Bricks as a passive portal.",
    leadObjective: "CONVERT",
    alsoObjectives: [],
    highValue: false,
    keyAction: "Educate then convert",
    questions: [],
    suggestedIncentive: "None",
  },
  F7: {
    code: "F7",
    name: "High-Intent Paused",
    tier: "FREE",
    estSize: "~46",
    definition:
      "Clicked an upgrade CTA or hit a Pro paywall in 30 days but did not complete checkout. The 58.7% CTA-to-checkout drop is the most directly addressable leak.",
    leadObjective: "CONVERT",
    alsoObjectives: ["FEEDBACK"],
    highValue: true,
    keyAction: "Recover checkout + ask why",
    questions: [
      "What stopped you from completing the upgrade?",
      "Was it the price, the timing, or uncertainty about value?",
      "Which specific feature triggered the paywall?",
      "Would a short free trial have changed your decision?",
    ],
    suggestedIncentive: "Entry into an Amazon.ae voucher draw",
  },
  F8: {
    code: "F8",
    name: "Ghost / Dormant",
    tier: "FREE",
    estSize: "200–250",
    definition:
      "Signed up 14+ days ago with zero activity in the last 14 days. Largest segment; 8–18 go dormant weekly. Goal is re-activation, not an immediate sale.",
    leadObjective: "REENGAGE",
    alsoObjectives: ["CONVERT", "FEEDBACK"],
    highValue: false,
    keyAction: "Winback, re-qualify, then convert",
    questions: [],
    suggestedIncentive: "None",
  },
  P1: {
    code: "P1",
    name: "Advisor-Only Pro",
    tier: "PRO",
    estSize: "15–20",
    definition:
      "Pro subscribers using the AI advisor but not rent optimization or the simulator in 30 days. Getting value from one tool only.",
    leadObjective: "FEEDBACK",
    alsoObjectives: [],
    highValue: true,
    keyAction: "Survey + feature nudge",
    questions: [
      "What kinds of questions do you mostly ask the advisor?",
      "Are you primarily a buyer, investor, or landlord right now?",
      "Did you know your plan also includes Rent Optimization and the Portfolio Simulator?",
      "What's the biggest investment decision you're working through?",
    ],
    suggestedIncentive: "Amazon.ae voucher on completion",
  },
  P2: {
    code: "P2",
    name: "Rent Optimization-Only Pro",
    tier: "PRO",
    estSize: "5–10",
    definition:
      "Pro subscribers using rent optimization but not the advisor or simulator. Upgraded to solve a landlord problem; haven't found the advisor.",
    leadObjective: "FEEDBACK",
    alsoObjectives: [],
    highValue: true,
    keyAction: "Survey + feature nudge",
    questions: [
      "What did you set out to do with the tool — and did you get there?",
      "After using it, what question do you still have that the output doesn't answer?",
      "Do you own or are you evaluating other properties that the tool could help with?",
      "Have you made a real decision based on the result yet?",
    ],
    suggestedIncentive: "Amazon.ae voucher on completion",
  },
  P3: {
    code: "P3",
    name: "Portfolio Simulator-Only Pro",
    tier: "PRO",
    estSize: "5–10",
    definition:
      "Pro subscribers running the simulator but not using the advisor or rent optimization. Generating scenarios without interpreting them.",
    leadObjective: "FEEDBACK",
    alsoObjectives: [],
    highValue: true,
    keyAction: "Survey + feature nudge",
    questions: [
      "What did you set out to do with the tool — and did you get there?",
      "After using it, what question do you still have that the output doesn't answer?",
      "Do you own or are you evaluating other properties that the tool could help with?",
      "Have you made a real decision based on the result yet?",
    ],
    suggestedIncentive: "Amazon.ae voucher on completion",
  },
  P4: {
    code: "P4",
    name: "Multi-Feature Power User",
    tier: "PRO",
    estSize: "40–45",
    definition:
      "Pro subscribers active across 2+ Pro features in 14 days. The ideal users — compound value, highest retention, best advocacy and feedback prospects.",
    leadObjective: "FEEDBACK",
    alsoObjectives: [],
    highValue: true,
    keyAction: "Interview + reward + refer",
    questions: [
      "Which Pro feature has had the biggest impact on a real decision you've made?",
      "If you could keep only one feature, which would it be and why?",
      "What tool or website are you still using alongside Smart Bricks that we should replace?",
      "How likely are you to recommend Smart Bricks to another Dubai investor (1–10)?",
      "What is still missing or frustrating in your workflow?",
    ],
    suggestedIncentive: "Amazon.ae voucher + 3 months free annual plan",
  },
  P5: {
    code: "P5",
    name: "Pro Zero",
    tier: "PRO",
    estSize: "~10 (of ~75–80% of Pro base)",
    definition:
      "Pro subscribers with zero Pro-feature use in 14 days. Paying without activating — the primary churn driver.",
    leadObjective: "REENGAGE",
    alsoObjectives: ["FEEDBACK"],
    highValue: false,
    keyAction: "Win back to active use + ask why",
    questions: [],
    suggestedIncentive: "None",
  },
};

export const SEGMENT_ORDER: Segment[] = [
  "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "P1", "P2", "P3", "P4", "P5",
];

export function segmentLabel(code: Segment): string {
  return `${code} · ${SEGMENTS[code].name}`;
}
