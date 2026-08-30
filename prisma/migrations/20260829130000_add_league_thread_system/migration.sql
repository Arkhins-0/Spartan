-- CreateEnum
CREATE TYPE "LeagueThreadKind" AS ENUM ('INSTRUCTION', 'TEAM_REQUEST');

-- CreateEnum
CREATE TYPE "LeagueThreadStatus" AS ENUM ('OPEN', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "LeagueThreadTeamStatusValue" AS ENUM ('PENDING', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "LeagueThreadEntryKind" AS ENUM ('MESSAGE', 'RESOLVE', 'CLOSE', 'REOPEN');

-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "operationalThreadNotifications" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "league_threads" (
    "id" TEXT NOT NULL,
    "kind" "LeagueThreadKind" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "priority" "MessagePriority" NOT NULL DEFAULT 'NORMAL',
    "leagueId" TEXT NOT NULL,
    "originTeamId" TEXT,
    "requiresResponse" BOOLEAN NOT NULL DEFAULT true,
    "status" "LeagueThreadStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_thread_team_status" (
    "id" TEXT NOT NULL,
    "status" "LeagueThreadTeamStatusValue" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "threadId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "league_thread_team_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_thread_entries" (
    "id" TEXT NOT NULL,
    "kind" "LeagueThreadEntryKind" NOT NULL DEFAULT 'MESSAGE',
    "body" TEXT,
    "threadId" TEXT NOT NULL,
    "actorTeamId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_thread_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "league_threads_leagueId_kind_status_createdAt_idx" ON "league_threads"("leagueId", "kind", "status", "createdAt");

-- CreateIndex
CREATE INDEX "league_threads_originTeamId_status_idx" ON "league_threads"("originTeamId", "status");

-- CreateIndex
CREATE INDEX "league_thread_team_status_teamId_status_idx" ON "league_thread_team_status"("teamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "league_thread_team_status_threadId_teamId_key" ON "league_thread_team_status"("threadId", "teamId");

-- CreateIndex
CREATE INDEX "league_thread_entries_threadId_createdAt_idx" ON "league_thread_entries"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "league_threads" ADD CONSTRAINT "league_threads_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_threads" ADD CONSTRAINT "league_threads_originTeamId_fkey" FOREIGN KEY ("originTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_threads" ADD CONSTRAINT "league_threads_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_threads" ADD CONSTRAINT "league_threads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_thread_team_status" ADD CONSTRAINT "league_thread_team_status_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "league_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_thread_team_status" ADD CONSTRAINT "league_thread_team_status_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_thread_entries" ADD CONSTRAINT "league_thread_entries_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "league_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_thread_entries" ADD CONSTRAINT "league_thread_entries_actorTeamId_fkey" FOREIGN KEY ("actorTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_thread_entries" ADD CONSTRAINT "league_thread_entries_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
