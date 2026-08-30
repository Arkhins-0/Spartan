-- CreateEnum
CREATE TYPE "RaceRoundStatus" AS ENUM ('SCHEDULED', 'RESULTS_PENDING', 'FINALIZED');

-- CreateEnum
CREATE TYPE "RaceResultStatus" AS ENUM ('CLASSIFIED', 'DNF', 'DNS', 'DSQ');

-- CreateTable
CREATE TABLE "race_rounds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "raceDate" DATE NOT NULL,
    "locationText" TEXT,
    "notes" TEXT,
    "status" "RaceRoundStatus" NOT NULL DEFAULT 'SCHEDULED',
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT,
    "venueId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "race_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "race_results" (
    "id" TEXT NOT NULL,
    "position" INTEGER,
    "points" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "status" "RaceResultStatus" NOT NULL DEFAULT 'CLASSIFIED',
    "notes" TEXT,
    "roundId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "race_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "race_rounds_leagueId_raceDate_idx" ON "race_rounds"("leagueId", "raceDate");

-- CreateIndex
CREATE INDEX "race_rounds_seasonId_roundNumber_idx" ON "race_rounds"("seasonId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "race_rounds_leagueId_roundNumber_key" ON "race_rounds"("leagueId", "roundNumber");

-- CreateIndex
CREATE INDEX "race_results_roundId_position_idx" ON "race_results"("roundId", "position");

-- CreateIndex
CREATE INDEX "race_results_teamId_idx" ON "race_results"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "race_results_roundId_teamId_playerId_key" ON "race_results"("roundId", "teamId", "playerId");

-- AddForeignKey
ALTER TABLE "race_rounds" ADD CONSTRAINT "race_rounds_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_rounds" ADD CONSTRAINT "race_rounds_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_rounds" ADD CONSTRAINT "race_rounds_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_rounds" ADD CONSTRAINT "race_rounds_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "race_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
