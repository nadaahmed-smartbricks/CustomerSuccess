-- CreateEnum
CREATE TYPE "ExclusionKind" AS ENUM ('DOMAIN', 'EMAIL', 'PHONE');

-- CreateTable
CREATE TABLE "ExcludedContact" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "ExclusionKind" NOT NULL,
    "value" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "ExcludedContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExcludedContact_kind_value_key" ON "ExcludedContact"("kind", "value");
