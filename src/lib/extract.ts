// v3: turn a call transcript into structured feedback using Claude.
// Transcription (audio → text) is done by a separate speech-to-text service; this
// module does the understanding — extracting the fields of our Feedback model from text.

import Anthropic from "@anthropic-ai/sdk";
import { SEGMENTS } from "@/lib/segments";
import type { Segment } from "@/generated/prisma/enums";

// Configurable so the model can be changed without a code edit.
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

export function anthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type ExtractedFeedback = {
  summary: string;
  npsScore: number | null;
  blocker: string | null;
  featureRequest: string | null;
  competitorTool: string | null;
  quote: string | null;
  outcome: string | null;
  themeTags: string[];
  responses: { question: string; answer: string }[];
};

// JSON Schema for the forced tool call — Claude fills this in from the transcript.
function schema(questions: string[]) {
  return {
    type: "object",
    properties: {
      summary: { type: "string", description: "2–4 sentence summary of what happened on the call." },
      npsScore: {
        type: ["integer", "null"],
        description: "0–10 likelihood-to-recommend if the customer stated or clearly implied one, otherwise null.",
      },
      blocker: { type: ["string", "null"], description: "The main thing stopping them, if any." },
      featureRequest: { type: ["string", "null"], description: "A concrete feature or improvement they asked for, if any." },
      competitorTool: { type: ["string", "null"], description: "Any tool/platform they use alongside or instead of Smart Bricks." },
      quote: { type: ["string", "null"], description: "One short verbatim quote worth keeping, else null." },
      outcome: {
        type: ["string", "null"],
        enum: ["CONVERTED", "FOLLOW_UP_SCHEDULED", "GAVE_FEEDBACK", "NOT_INTERESTED", "FEATURE_REQUESTED", "NO_ANSWER_YET", null],
        description: "Best-fit outcome of the call.",
      },
      themeTags: {
        type: "array",
        items: { type: "string" },
        description: "1–5 short kebab-case roadmap theme tags (e.g. pricing, rent-tool, onboarding).",
      },
      responses: {
        type: "array",
        description: "Answers to the segment's feedback questions that the transcript actually covers. Omit questions it doesn't address.",
        items: {
          type: "object",
          properties: {
            question: { type: "string", enum: questions.length ? questions : undefined },
            answer: { type: "string" },
          },
          required: ["question", "answer"],
        },
      },
    },
    required: ["summary", "npsScore", "blocker", "featureRequest", "competitorTool", "quote", "outcome", "themeTags", "responses"],
  };
}

export async function extractFeedback(
  transcript: string,
  segment: Segment,
): Promise<ExtractedFeedback> {
  if (!anthropicConfigured()) {
    throw new Error("ANTHROPIC_API_KEY is not set — AI extraction is unavailable.");
  }

  const seg = SEGMENTS[segment];
  const client = new Anthropic();

  const system = [
    "You extract structured customer feedback from a sales or customer-success call transcript for Smart Bricks, a Dubai property-investment platform (AI advisor, portfolio, rent optimization, simulator).",
    `The person is in segment ${segment} — ${seg.name}: ${seg.definition}`,
    "Extract only what the transcript supports. Never invent details. Use null when something isn't present. Keep every field concise and faithful; quotes must be verbatim.",
  ].join("\n");

  const questionList = seg.questions.length
    ? `Segment feedback questions (answer only those the call actually covers):\n${seg.questions
        .map((q, i) => `${i + 1}. ${q}`)
        .join("\n")}\n\n`
    : "";

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    tools: [
      {
        name: "record_feedback",
        description: "Record the structured feedback extracted from the call transcript.",
        input_schema: schema(seg.questions) as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "record_feedback" },
    messages: [{ role: "user", content: `${questionList}Transcript:\n${transcript}` }],
  });

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("The model did not return structured feedback. Try again.");
  }

  const raw = block.input as Partial<ExtractedFeedback>;
  return {
    summary: typeof raw.summary === "string" ? raw.summary : "",
    npsScore: typeof raw.npsScore === "number" ? raw.npsScore : null,
    blocker: raw.blocker ?? null,
    featureRequest: raw.featureRequest ?? null,
    competitorTool: raw.competitorTool ?? null,
    quote: raw.quote ?? null,
    outcome: raw.outcome ?? null,
    themeTags: Array.isArray(raw.themeTags) ? raw.themeTags.filter((t) => typeof t === "string") : [],
    responses: Array.isArray(raw.responses)
      ? raw.responses.filter((r) => r && typeof r.question === "string" && typeof r.answer === "string")
      : [],
  };
}
