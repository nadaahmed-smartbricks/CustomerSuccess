// Sample data so the tracker is explorable out of the box.
// Run with `npm run db:seed`. Safe to re-run — it clears and reseeds.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  await prisma.feedback.deleteMany();
  await prisma.outreach.deleteMany();
  await prisma.person.deleteMany();

  // F2 — Advisor Blocked: reached, gave feedback, converting.
  const layla = await prisma.person.create({
    data: {
      name: "Layla Haddad",
      email: "layla.haddad@example.com",
      tier: "FREE",
      segment: "F2",
      leadObjective: "CONVERT",
      activitySignal: "Hit advisor message limit 3 days ago",
      outreaches: {
        create: {
          channel: "WHATSAPP",
          owner: "Justin",
          status: "REACHED",
          outcome: "GAVE_FEEDBACK",
          incentiveType: "AMAZON_VOUCHER",
          incentiveStatus: "OFFERED",
          nextAction: "Send unlimited-advisor trial link",
          nextActionDueAt: new Date(Date.now() + 2 * 864e5),
          notes: "Very warm — was researching a JVC 1-bed when she got capped.",
          feedback: {
            create: {
              npsScore: 8,
              blocker: "Ran out of free advisor questions mid-research",
              featureRequest: "Save advisor chats to revisit later",
              themeTags: ["advisor-limit", "pricing"],
              responses: {
                "What were you trying to find out when you hit the limit?":
                  "Whether JVC or Arjan gives better 5-year yield.",
                "Would you upgrade for unlimited advisor access alone, even without the other Pro features?":
                  "Yes, if it were priced fairly.",
              },
            },
          },
        },
      },
    },
  });

  // F7 — High-Intent Paused: attempted, no answer yet.
  await prisma.person.create({
    data: {
      name: "Omar Nasser",
      email: "omar.nasser@example.com",
      tier: "FREE",
      segment: "F7",
      leadObjective: "CONVERT",
      activitySignal: "Abandoned checkout at Pro paywall (Simulator)",
      outreaches: {
        create: {
          channel: "CALL",
          callTier: "TIER_1",
          owner: "Justin",
          status: "ATTEMPTED",
          outcome: "NO_ANSWER_YET",
          attempts: 2,
          nextAction: "Retry call tomorrow afternoon",
          nextActionDueAt: new Date(Date.now() + 1 * 864e5),
        },
      },
    },
  });

  // P4 — Multi-Feature Power User: interviewed, promoter.
  await prisma.person.create({
    data: {
      name: "Priya Menon",
      email: "priya.menon@example.com",
      tier: "PRO",
      segment: "P4",
      leadObjective: "FEEDBACK",
      activitySignal: "Active across advisor + rent optimizer in last 14 days",
      outreaches: {
        create: {
          channel: "CALL",
          callTier: "TIER_3",
          owner: "Nada",
          status: "DONE",
          outcome: "GAVE_FEEDBACK",
          incentiveType: "PRO_TRIAL",
          incentiveStatus: "SENT",
          notes: "Great advocate — willing to refer two other landlords.",
          feedback: {
            create: {
              npsScore: 10,
              featureRequest: "Portfolio-level rent-vs-sell summary across all units",
              competitorTool: "Property Monitor",
              quote: "The rent optimizer paid for the subscription in one renewal.",
              themeTags: ["portfolio-dashboard", "advocacy", "rent-tool"],
            },
          },
        },
      },
    },
  });

  // P5 — Pro Zero: needs re-engagement, not yet contacted.
  await prisma.person.create({
    data: {
      name: "Khalid Rahman",
      email: "khalid.rahman@example.com",
      tier: "PRO",
      segment: "P5",
      leadObjective: "REENGAGE",
      activitySignal: "Paying but zero Pro-feature use in 14 days — renews in 9 days",
    },
  });

  // F1 — Advisor Curious: not yet contacted.
  await prisma.person.create({
    data: {
      name: "Sara Ali",
      email: "sara.ali@example.com",
      tier: "FREE",
      segment: "F1",
      leadObjective: "CONVERT",
      activitySignal: "Asked the advisor twice this week",
    },
  });

  console.log(`Seeded. Sample warm lead: ${layla.name} (${layla.email}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
