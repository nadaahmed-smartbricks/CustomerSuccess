// HogQL that maps each of the 13 segments to real Smart Bricks events.
// Validated against the live project (id 91184) via the PostHog MCP: person-property
// access, email retrieval, anti-joins, and array set-membership all execute correctly.
//
// These are a considered first pass — thresholds (30d / 14d windows, 5+ views, etc.)
// come straight from the segmentation brief and are easy to tune here without touching
// the sync engine. Every query returns three columns: email, name, person_id.

import type { Segment } from "@/generated/prisma/enums";
import { SEGMENT_ORDER } from "@/lib/segments";

// Exclude Smart Bricks staff at the query level via the flag. Domain and personal-email
// exclusions are applied in the sync engine (see src/lib/exclusions.ts) so they can be
// edited in the app without changing these queries.
const INTERNAL = "coalesce(person.properties.is_sb_internal_user, false) = false";

// Standard projection every segment query selects.
const SELECT = `person.properties.email AS email,
  any(person.properties.name) AS name,
  any(toString(person.id)) AS person_id`;

export type SegmentQuery = {
  /** Short human explanation stored on the Person as its activity signal. */
  signal: string;
  /** HogQL returning email, name, person_id. */
  sql: string;
};

export const SEGMENT_QUERIES: Record<Segment, SegmentQuery> = {
  F1: {
    signal: "Messaged the AI advisor 1–3 times in 30 days (not yet capped)",
    sql: `SELECT ${SELECT}, count() AS msgs
FROM events
WHERE event = 'advisor_message_sent'
  AND timestamp >= now() - INTERVAL 30 DAY
  AND person.properties.subscription_plan = 'free'
  AND person.properties.email IS NOT NULL
  AND ${INTERNAL}
GROUP BY email
HAVING msgs BETWEEN 1 AND 3
  AND email NOT IN (
    SELECT person.properties.email FROM events
    WHERE event IN ('advisor_limit_hit', 'upgrade_cta_clicked')
      AND timestamp >= now() - INTERVAL 30 DAY
  )`,
  },
  F2: {
    signal: "Hit the advisor message limit in the last 30 days",
    sql: `SELECT ${SELECT}
FROM events
WHERE event = 'advisor_limit_hit'
  AND timestamp >= now() - INTERVAL 30 DAY
  AND person.properties.subscription_plan = 'free'
  AND person.properties.email IS NOT NULL
  AND ${INTERNAL}
GROUP BY email`,
  },
  F3: {
    signal: "Added a property in 30 days but never saw an upgrade CTA",
    sql: `SELECT ${SELECT}
FROM events
WHERE event = 'add_property_save_clicked'
  AND timestamp >= now() - INTERVAL 30 DAY
  AND person.properties.subscription_plan = 'free'
  AND person.properties.email IS NOT NULL
  AND ${INTERNAL}
GROUP BY email
HAVING email NOT IN (
    SELECT person.properties.email FROM events
    WHERE event IN ('upgrade_cta_clicked', 'upgrade_modal_viewed')
      AND timestamp >= now() - INTERVAL 30 DAY
  )`,
  },
  F4: {
    signal: "Opened the portfolio simulator but never used the Pro version",
    sql: `SELECT ${SELECT}
FROM events
WHERE event = 'portfolio_simulator_viewed'
  AND timestamp >= now() - INTERVAL 30 DAY
  AND person.properties.subscription_plan = 'free'
  AND person.properties.email IS NOT NULL
  AND ${INTERNAL}
GROUP BY email
HAVING email NOT IN (
    SELECT person.properties.email FROM events
    WHERE event = 'pro_feature_used' AND properties.feature_name = 'portfolio_simulator'
      AND timestamp >= now() - INTERVAL 30 DAY
  )`,
  },
  F5: {
    signal: "Viewed the rent optimization page but not the Pro RERA analysis",
    sql: `SELECT ${SELECT}
FROM events
WHERE event = 'rent_optimisation_page_viewed'
  AND timestamp >= now() - INTERVAL 30 DAY
  AND person.properties.subscription_plan = 'free'
  AND person.properties.email IS NOT NULL
  AND ${INTERNAL}
GROUP BY email
HAVING email NOT IN (
    SELECT person.properties.email FROM events
    WHERE event = 'pro_feature_used' AND properties.feature_name = 'rent_optimisation_full'
      AND timestamp >= now() - INTERVAL 30 DAY
  )`,
  },
  F6: {
    signal: "5+ property views/searches in 30 days but used no feature",
    sql: `SELECT ${SELECT}, count() AS views
FROM events
WHERE event IN ('pdp_viewed', 'search_used')
  AND timestamp >= now() - INTERVAL 30 DAY
  AND person.properties.subscription_plan = 'free'
  AND person.properties.email IS NOT NULL
  AND ${INTERNAL}
GROUP BY email
HAVING views >= 5
  AND email NOT IN (
    SELECT person.properties.email FROM events
    WHERE event IN ('advisor_message_sent', 'pro_feature_used', 'add_property_save_clicked',
                    'rent_optimisation_page_viewed', 'portfolio_simulator_viewed', 'upgrade_cta_clicked')
      AND timestamp >= now() - INTERVAL 30 DAY
  )`,
  },
  F7: {
    signal: "Clicked upgrade / hit a paywall in 30 days but didn't check out",
    sql: `SELECT ${SELECT}
FROM events
WHERE event IN ('upgrade_cta_clicked', 'pro_feature_gate_hit', 'upgrade_abandoned')
  AND timestamp >= now() - INTERVAL 30 DAY
  AND person.properties.subscription_plan = 'free'
  AND person.properties.email IS NOT NULL
  AND ${INTERNAL}
GROUP BY email
HAVING email NOT IN (
    SELECT person.properties.email FROM events
    WHERE event = 'checkout_completed' AND timestamp >= now() - INTERVAL 30 DAY
  )`,
  },
  F8: {
    signal: "Signed up 14+ days ago with zero activity in the last 14 days",
    sql: `SELECT ${SELECT}
FROM events
WHERE event = 'sign_up'
  AND timestamp < now() - INTERVAL 14 DAY
  AND timestamp >= now() - INTERVAL 180 DAY
  AND person.properties.subscription_plan = 'free'
  AND person.properties.email IS NOT NULL
  AND ${INTERNAL}
GROUP BY email
HAVING email NOT IN (
    SELECT person.properties.email FROM events
    WHERE timestamp >= now() - INTERVAL 14 DAY
  )`,
  },
  P1: {
    signal: "Pro: using the advisor only — not rent optimization or the simulator",
    sql: proSingleFeature("advisor_unlimited"),
  },
  P2: {
    signal: "Pro: using rent optimization only — not the advisor or simulator",
    sql: proSingleFeature("rent_optimisation_full"),
  },
  P3: {
    signal: "Pro: running the simulator only — not the advisor or rent optimization",
    sql: proSingleFeature("portfolio_simulator"),
  },
  P4: {
    signal: "Pro: active across 2+ Pro features in the last 14 days",
    sql: `SELECT ${SELECT}, count(DISTINCT properties.feature_name) AS features
FROM events
WHERE event = 'pro_feature_used'
  AND timestamp >= now() - INTERVAL 14 DAY
  AND person.properties.subscription_plan = 'pro'
  AND person.properties.email IS NOT NULL
  AND ${INTERNAL}
GROUP BY email
HAVING features >= 2`,
  },
  P5: {
    signal: "Pro: zero Pro-feature use in the last 14 days (activation risk)",
    sql: `SELECT ${SELECT}
FROM events
WHERE timestamp >= now() - INTERVAL 30 DAY
  AND person.properties.subscription_plan = 'pro'
  AND person.properties.email IS NOT NULL
  AND ${INTERNAL}
GROUP BY email
HAVING email NOT IN (
    SELECT person.properties.email FROM events
    WHERE event = 'pro_feature_used' AND timestamp >= now() - INTERVAL 14 DAY
  )`,
  },
};

// P1/P2/P3: Pro users who used exactly one of the three core features in the last 30 days.
function proSingleFeature(only: string): string {
  const others = ["advisor_unlimited", "rent_optimisation_full", "portfolio_simulator"].filter(
    (f) => f !== only,
  );
  return `SELECT email, name, person_id FROM (
  SELECT ${SELECT}, groupUniqArray(properties.feature_name) AS feats
  FROM events
  WHERE event = 'pro_feature_used'
    AND timestamp >= now() - INTERVAL 30 DAY
    AND person.properties.subscription_plan = 'pro'
    AND person.properties.email IS NOT NULL
    AND ${INTERNAL}
  GROUP BY email
)
WHERE has(feats, '${only}')
  AND NOT has(feats, '${others[0]}')
  AND NOT has(feats, '${others[1]}')`;
}

// Priority order for de-duplicating people who match multiple segments during a sync:
// highest-intent / highest-value first, so a person is assigned their most actionable segment.
export const SYNC_PRIORITY: Segment[] = [
  "F2", "F7", "F5", "F1", // free: convert-now / high intent
  "P4", "P1", "P2", "P3", // pro: feedback & advocacy
  "P5", "F8",             // re-engagement
  "F3", "F4", "F6",       // nurture
];

// Sanity: keep priority list in sync with the full segment set.
if (SYNC_PRIORITY.length !== SEGMENT_ORDER.length) {
  throw new Error("SYNC_PRIORITY must cover every segment.");
}
