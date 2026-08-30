-- CreateEnum
CREATE TYPE "RaceSessionKind" AS ENUM ('PRACTICE', 'QUALIFYING', 'RACE', 'SUPPORT', 'ADMIN');

-- CreateEnum
CREATE TYPE "RaceEntryStatus" AS ENUM ('PROVISIONAL', 'CONFIRMED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "associationRoundId" TEXT;

-- AlterTable
ALTER TABLE "association_role_grants" ADD COLUMN     "roundId" TEXT;

-- AlterTable
ALTER TABLE "race_rounds" ADD COLUMN     "endAt" TIMESTAMP(3),
ADD COLUMN     "startAt" TIMESTAMP(3),
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/New_York';

-- AlterTable
ALTER TABLE "volunteer_needs" ADD COLUMN     "roundId" TEXT,
ADD COLUMN     "sessionId" TEXT;

-- CreateTable
CREATE TABLE "race_sessions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "RaceSessionKind" NOT NULL DEFAULT 'RACE',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roundId" TEXT NOT NULL,
    "venueId" TEXT,
    "surfaceId" TEXT,
    "segmentId" TEXT,
    "reservationId" TEXT,
    "createdById" TEXT,

    CONSTRAINT "race_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "race_entries" (
    "id" TEXT NOT NULL,
    "carNumber" TEXT,
    "className" TEXT,
    "status" "RaceEntryStatus" NOT NULL DEFAULT 'PROVISIONAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roundId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT,
    "registeredById" TEXT,

    CONSTRAINT "race_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "race_sessions_roundId_startAt_idx" ON "race_sessions"("roundId", "startAt");

-- CreateIndex
CREATE INDEX "race_sessions_reservationId_idx" ON "race_sessions"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "race_sessions_roundId_sortOrder_key" ON "race_sessions"("roundId", "sortOrder");

-- CreateIndex
CREATE INDEX "race_entries_roundId_status_idx" ON "race_entries"("roundId", "status");

-- CreateIndex
CREATE INDEX "race_entries_teamId_idx" ON "race_entries"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "race_entries_roundId_teamId_playerId_key" ON "race_entries"("roundId", "teamId", "playerId");

-- CreateIndex
CREATE INDEX "volunteer_needs_roundId_status_idx" ON "volunteer_needs"("roundId", "status");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_associationRoundId_fkey" FOREIGN KEY ("associationRoundId") REFERENCES "race_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_sessions" ADD CONSTRAINT "race_sessions_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "race_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_sessions" ADD CONSTRAINT "race_sessions_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_sessions" ADD CONSTRAINT "race_sessions_surfaceId_fkey" FOREIGN KEY ("surfaceId") REFERENCES "ice_surfaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_sessions" ADD CONSTRAINT "race_sessions_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "surface_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_sessions" ADD CONSTRAINT "race_sessions_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "venue_reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_sessions" ADD CONSTRAINT "race_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_entries" ADD CONSTRAINT "race_entries_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "race_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_entries" ADD CONSTRAINT "race_entries_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_entries" ADD CONSTRAINT "race_entries_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_entries" ADD CONSTRAINT "race_entries_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "association_role_grants" ADD CONSTRAINT "association_role_grants_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "race_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_needs" ADD CONSTRAINT "volunteer_needs_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "race_rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_needs" ADD CONSTRAINT "volunteer_needs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "race_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The scope CHECK from 20260819024354 predates the RACE_ROUND scope: it is a
-- CASE with no ELSE, so a RACE_ROUND row evaluated to NULL and the CHECK passed
-- whatever was in the other five columns. Rewritten to cover the new scope and
-- to fail closed on any scope added later without touching this constraint.
ALTER TABLE "association_role_grants"
  DROP CONSTRAINT "association_role_grants_scope_matches_type_check";

ALTER TABLE "association_role_grants"
  ADD CONSTRAINT "association_role_grants_scope_matches_type_check"
  CHECK (
    CASE "scopeType"
      WHEN 'ASSOCIATION'  THEN num_nonnulls("divisionId", "teamId", "seasonId", "eventId", "signupEventId", "roundId") = 0
      WHEN 'DIVISION'     THEN "divisionId"    IS NOT NULL AND num_nonnulls("teamId", "seasonId", "eventId", "signupEventId", "roundId") = 0
      WHEN 'TEAM'         THEN "teamId"        IS NOT NULL AND num_nonnulls("divisionId", "seasonId", "eventId", "signupEventId", "roundId") = 0
      WHEN 'SEASON'       THEN "seasonId"      IS NOT NULL AND num_nonnulls("divisionId", "teamId", "eventId", "signupEventId", "roundId") = 0
      WHEN 'EVENT'        THEN "eventId"       IS NOT NULL AND num_nonnulls("divisionId", "teamId", "seasonId", "signupEventId", "roundId") = 0
      WHEN 'SIGNUP_EVENT' THEN "signupEventId" IS NOT NULL AND num_nonnulls("divisionId", "teamId", "seasonId", "eventId", "roundId") = 0
      WHEN 'RACE_ROUND'   THEN "roundId"       IS NOT NULL AND num_nonnulls("divisionId", "teamId", "seasonId", "eventId", "signupEventId") = 0
      ELSE false
    END
  );

-- A need may name a whole race weekend, or one session of it, but a session
-- without its round would leave the board unable to say which weekend the shift
-- belongs to.
ALTER TABLE "volunteer_needs"
  ADD CONSTRAINT "volunteer_needs_session_implies_round_check"
  CHECK ("sessionId" IS NULL OR "roundId" IS NOT NULL);

-- A session belongs to the weekend it is timetabled in.
ALTER TABLE "race_sessions"
  ADD CONSTRAINT "race_sessions_interval_check" CHECK ("endAt" > "startAt");

-- Either both ends of the operational window are set, or neither is.
ALTER TABLE "race_rounds"
  ADD CONSTRAINT "race_rounds_window_check"
  CHECK (num_nonnulls("startAt", "endAt") <> 1 AND ("endAt" IS NULL OR "endAt" > "startAt"));
