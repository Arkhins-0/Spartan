-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('ENTRY_FORM', 'TECH_INSPECTION', 'MEDICAL_CERTIFICATE', 'RESULTS_SHEET', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT,
    "threadId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "removedById" TEXT,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_leagueId_kind_createdAt_idx" ON "documents"("leagueId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "documents_teamId_kind_createdAt_idx" ON "documents"("teamId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "documents_threadId_idx" ON "documents"("threadId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "league_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
