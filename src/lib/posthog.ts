// Minimal server-side PostHog HogQL client used by the segment sync (v1).
// Uses a personal API key (POSTHOG_API_KEY) — never expose this to the browser.

const HOST = process.env.POSTHOG_HOST || "https://us.posthog.com";
const PROJECT = process.env.POSTHOG_PROJECT_ID;
const KEY = process.env.POSTHOG_API_KEY;

export function posthogConfigured(): boolean {
  return Boolean(KEY && PROJECT);
}

export type HogQLRow = Record<string, unknown>;

/** Run a HogQL query against the configured project and return rows as objects keyed by column name. */
export async function runHogQL(query: string): Promise<HogQLRow[]> {
  if (!KEY || !PROJECT) {
    throw new Error(
      "PostHog is not configured. Set POSTHOG_API_KEY and POSTHOG_PROJECT_ID in the environment.",
    );
  }

  const res = await fetch(`${HOST}/api/projects/${PROJECT}/query/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PostHog query failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { columns: string[]; results: unknown[][] };
  return data.results.map((row) =>
    Object.fromEntries(data.columns.map((col, i) => [col, row[i]])),
  );
}
