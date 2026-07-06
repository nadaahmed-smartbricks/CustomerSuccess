-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "UnmatchedCall" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "transcript" TEXT NOT NULL,
    "aiSummary" TEXT,
    "provider" TEXT,
    "externalId" TEXT,
    "handled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UnmatchedCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnmatchedCall_handled_idx" ON "UnmatchedCall"("handled");

-- CreateIndex
CREATE INDEX "Person_phone_idx" ON "Person"("phone");
