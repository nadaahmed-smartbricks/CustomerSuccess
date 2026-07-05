-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "Segment" AS ENUM ('F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'P1', 'P2', 'P3', 'P4', 'P5');

-- CreateEnum
CREATE TYPE "Objective" AS ENUM ('CONVERT', 'REENGAGE', 'FEEDBACK');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('CALL', 'IN_PERSON', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "CallTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('TO_CONTACT', 'ATTEMPTED', 'REACHED', 'NO_RESPONSE', 'DECLINED', 'DONE');

-- CreateEnum
CREATE TYPE "Outcome" AS ENUM ('CONVERTED', 'FOLLOW_UP_SCHEDULED', 'GAVE_FEEDBACK', 'NOT_INTERESTED', 'FEATURE_REQUESTED', 'NO_ANSWER_YET');

-- CreateEnum
CREATE TYPE "IncentiveType" AS ENUM ('NONE', 'AMAZON_VOUCHER', 'NOON_VOUCHER', 'PRO_TRIAL', 'EARLY_ACCESS', 'MARKET_REPORT');

-- CreateEnum
CREATE TYPE "IncentiveStatus" AS ENUM ('NOT_OFFERED', 'OFFERED', 'SENT');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'FREE',
    "segment" "Segment" NOT NULL,
    "leadObjective" "Objective" NOT NULL,
    "activitySignal" TEXT,
    "posthogDistinctId" TEXT,
    "notes" TEXT,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outreach" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "personId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "callTier" "CallTier",
    "owner" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "status" "OutreachStatus" NOT NULL DEFAULT 'TO_CONTACT',
    "outcome" "Outcome",
    "incentiveType" "IncentiveType" NOT NULL DEFAULT 'NONE',
    "incentiveStatus" "IncentiveStatus" NOT NULL DEFAULT 'NOT_OFFERED',
    "nextAction" TEXT,
    "nextActionDueAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "Outreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outreachId" TEXT NOT NULL,
    "npsScore" INTEGER,
    "blocker" TEXT,
    "featureRequest" TEXT,
    "competitorTool" TEXT,
    "quote" TEXT,
    "themeTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "responses" JSONB,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_key" ON "Person"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Person_posthogDistinctId_key" ON "Person"("posthogDistinctId");

-- CreateIndex
CREATE INDEX "Person_segment_idx" ON "Person"("segment");

-- CreateIndex
CREATE INDEX "Person_leadObjective_idx" ON "Person"("leadObjective");

-- CreateIndex
CREATE INDEX "Outreach_personId_idx" ON "Outreach"("personId");

-- CreateIndex
CREATE INDEX "Outreach_status_idx" ON "Outreach"("status");

-- CreateIndex
CREATE INDEX "Outreach_occurredAt_idx" ON "Outreach"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_outreachId_key" ON "Feedback"("outreachId");

-- AddForeignKey
ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_outreachId_fkey" FOREIGN KEY ("outreachId") REFERENCES "Outreach"("id") ON DELETE CASCADE ON UPDATE CASCADE;
