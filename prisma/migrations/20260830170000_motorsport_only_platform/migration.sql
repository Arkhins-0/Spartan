-- Motorsport-only platform (ADR-0012).
--
-- 1. Rename the generic-but-hockey-named surface models.
-- 2. Collapse Sport to MOTORSPORT and rewrite the rink-flavoured enums,
--    remapping existing rows onto their motorsport equivalents.
-- 3. Drop the hockey-only practice planner and the USA Hockey member ID.

-- ---------------------------------------------------------------------------
-- 1. Renames (data-preserving)
-- ---------------------------------------------------------------------------
ALTER TABLE "ice_surfaces" RENAME TO "venue_surfaces";
ALTER TABLE "ice_time_requests" RENAME TO "surface_time_requests";
ALTER TYPE "IceTimeRequestStatus" RENAME TO "SurfaceTimeRequestStatus";

-- Primary keys, unique indexes, and indexes keep Prisma's derived names.
ALTER INDEX "ice_surfaces_pkey" RENAME TO "venue_surfaces_pkey";
ALTER INDEX "ice_surfaces_venueId_name_key" RENAME TO "venue_surfaces_venueId_name_key";
ALTER INDEX "ice_surfaces_venueId_isActive_idx" RENAME TO "venue_surfaces_venueId_isActive_idx";
ALTER TABLE "venue_surfaces" RENAME CONSTRAINT "ice_surfaces_venueId_fkey" TO "venue_surfaces_venueId_fkey";

ALTER INDEX "ice_time_requests_pkey" RENAME TO "surface_time_requests_pkey";
ALTER INDEX "ice_time_requests_venueId_status_idx" RENAME TO "surface_time_requests_venueId_status_idx";
ALTER INDEX "ice_time_requests_scheduleBlockId_status_idx" RENAME TO "surface_time_requests_scheduleBlockId_status_idx";
ALTER INDEX "ice_time_requests_requesterUserId_idx" RENAME TO "surface_time_requests_requesterUserId_idx";
ALTER INDEX "ice_time_requests_requesterTeamId_idx" RENAME TO "surface_time_requests_requesterTeamId_idx";
ALTER INDEX "ice_time_requests_requesterLeagueId_idx" RENAME TO "surface_time_requests_requesterLeagueId_idx";
ALTER INDEX "ice_time_requests_approvedSurfaceId_idx" RENAME TO "surface_time_requests_approvedSurfaceId_idx";
ALTER INDEX "ice_time_requests_approvedSegmentId_idx" RENAME TO "surface_time_requests_approvedSegmentId_idx";
ALTER TABLE "surface_time_requests" RENAME CONSTRAINT "ice_time_requests_scheduleBlockId_fkey" TO "surface_time_requests_scheduleBlockId_fkey";
ALTER TABLE "surface_time_requests" RENAME CONSTRAINT "ice_time_requests_venueId_fkey" TO "surface_time_requests_venueId_fkey";
ALTER TABLE "surface_time_requests" RENAME CONSTRAINT "ice_time_requests_requesterUserId_fkey" TO "surface_time_requests_requesterUserId_fkey";
ALTER TABLE "surface_time_requests" RENAME CONSTRAINT "ice_time_requests_requesterTeamId_fkey" TO "surface_time_requests_requesterTeamId_fkey";
ALTER TABLE "surface_time_requests" RENAME CONSTRAINT "ice_time_requests_requesterLeagueId_fkey" TO "surface_time_requests_requesterLeagueId_fkey";
ALTER TABLE "surface_time_requests" RENAME CONSTRAINT "ice_time_requests_decidedById_fkey" TO "surface_time_requests_decidedById_fkey";
ALTER TABLE "surface_time_requests" RENAME CONSTRAINT "ice_time_requests_approvedSurfaceId_fkey" TO "surface_time_requests_approvedSurfaceId_fkey";
ALTER TABLE "surface_time_requests" RENAME CONSTRAINT "ice_time_requests_approvedSegmentId_fkey" TO "surface_time_requests_approvedSegmentId_fkey";
ALTER TABLE "surface_time_requests" RENAME CONSTRAINT "ice_time_requests_approved_interval_check" TO "surface_time_requests_approved_interval_check";
ALTER TABLE "surface_time_requests" RENAME CONSTRAINT "ice_time_requests_approved_segment_surface_check" TO "surface_time_requests_approved_segment_surface_check";

-- The storage-boundary ancestry triggers (20260817130000) are plpgsql, which
-- resolves table names at execution time, so their bodies must be reissued
-- against the renamed tables. Bodies are identical apart from the table names.
ALTER TRIGGER "ice_time_requests_approval_ancestry_trigger" ON "surface_time_requests"
  RENAME TO "surface_time_requests_approval_ancestry_trigger";
ALTER FUNCTION "validate_ice_time_request_approval_ancestry"()
  RENAME TO "validate_surface_time_request_approval_ancestry";

CREATE OR REPLACE FUNCTION "validate_venue_reservation_ancestry"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."surfaceId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "venue_surfaces"
    WHERE "id" = NEW."surfaceId" AND "venueId" = NEW."venueId"
  ) THEN
    RAISE EXCEPTION 'venue reservation surface does not belong to venue'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."segmentId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "surface_segments"
    WHERE "id" = NEW."segmentId" AND "surfaceId" = NEW."surfaceId"
  ) THEN
    RAISE EXCEPTION 'venue reservation segment does not belong to surface'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."ownerVenueOrganizationId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "venues"
    WHERE "id" = NEW."venueId"
      AND "organizationId" = NEW."ownerVenueOrganizationId"
  ) THEN
    RAISE EXCEPTION 'venue reservation organization owner does not own venue'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."ownerLeagueId" IS NOT NULL AND NOT (
    EXISTS (
      SELECT 1 FROM "venues"
      WHERE "id" = NEW."venueId" AND "leagueId" = NEW."ownerLeagueId"
    )
    OR EXISTS (
      SELECT 1 FROM "venue_relationships"
      WHERE "venueId" = NEW."venueId"
        AND "targetType" = 'LEAGUE'
        AND "leagueId" = NEW."ownerLeagueId"
        AND "teamId" IS NULL
        AND "status" = 'ACTIVE'
        AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
    )
  ) THEN
    RAISE EXCEPTION 'venue reservation league owner has no active venue relationship'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."ownerTeamId" IS NOT NULL AND NOT (
    EXISTS (
      SELECT 1 FROM "venues"
      WHERE "id" = NEW."venueId" AND "teamId" = NEW."ownerTeamId"
    )
    OR EXISTS (
      SELECT 1 FROM "venue_relationships"
      WHERE "venueId" = NEW."venueId"
        AND "targetType" = 'TEAM'
        AND "teamId" = NEW."ownerTeamId"
        AND "leagueId" IS NULL
        AND "status" = 'ACTIVE'
        AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
    )
  ) THEN
    RAISE EXCEPTION 'venue reservation team owner has no active venue relationship'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."sourceRequestId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "surface_time_requests" request
    LEFT JOIN "Team" requester_team
      ON requester_team."id" = request."requesterTeamId"
    WHERE request."id" = NEW."sourceRequestId"
      AND request."venueId" = NEW."venueId"
      AND request."status" IN ('ACCEPTED', 'PARTIALLY_ACCEPTED')
      AND request."scheduleBlockId" = NEW."offeringBlockId"
      AND request."approvedStartAt" = NEW."startsAt"
      AND request."approvedEndAt" = NEW."endsAt"
      AND request."approvedSurfaceId" IS NOT DISTINCT FROM NEW."surfaceId"
      AND request."approvedSegmentId" IS NOT DISTINCT FROM NEW."segmentId"
      AND request."requestedStartAt" <= NEW."startsAt"
      AND request."requestedEndAt" >= NEW."endsAt"
      AND (
        (
          request."requesterTeamId" IS NOT NULL
          AND NEW."ownerTeamId" = request."requesterTeamId"
          AND (
            request."requesterLeagueId" IS NULL
            OR requester_team."leagueId" = request."requesterLeagueId"
          )
        )
        OR (
          request."requesterTeamId" IS NULL
          AND request."requesterLeagueId" IS NOT NULL
          AND NEW."ownerLeagueId" = request."requesterLeagueId"
        )
        OR (
          request."requesterTeamId" IS NULL
          AND request."requesterLeagueId" IS NULL
          AND NEW."ownerVenueOrganizationId" IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM "venues" request_venue
            WHERE request_venue."id" = request."venueId"
              AND request_venue."organizationId" =
                NEW."ownerVenueOrganizationId"
          )
        )
      )
  ) THEN
    RAISE EXCEPTION 'venue reservation source request approval or owner does not match'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."offeringBlockId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "venue_schedule_blocks"
    WHERE "id" = NEW."offeringBlockId"
      AND "venueId" = NEW."venueId"
      AND "intent" = 'OFFERING'
  ) THEN
    RAISE EXCEPTION 'venue reservation offering block is not an offering at venue'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."sourceScheduleBlockId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "venue_schedule_blocks"
    WHERE "id" = NEW."sourceScheduleBlockId"
      AND "venueId" = NEW."venueId"
      AND "intent" IN ('VENUE_ACTIVITY', 'CLOSURE')
  ) THEN
    RAISE EXCEPTION 'venue reservation source schedule block is not occupying at venue'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."sourceRequestId" IS NOT NULL
    AND NEW."offeringBlockId" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "surface_time_requests"
      WHERE "id" = NEW."sourceRequestId"
        AND "scheduleBlockId" = NEW."offeringBlockId"
    )
  THEN
    RAISE EXCEPTION 'venue reservation request does not belong to offering block'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "validate_surface_time_request_approval_ancestry"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "venue_schedule_blocks" block
    WHERE block."id" = NEW."scheduleBlockId"
      AND block."venueId" = NEW."venueId"
  ) THEN
    RAISE EXCEPTION 'track time request block does not belong to request venue'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."approvedSurfaceId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "venue_surfaces"
    WHERE "id" = NEW."approvedSurfaceId" AND "venueId" = NEW."venueId"
  ) THEN
    RAISE EXCEPTION 'approved surface does not belong to request venue'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."approvedSegmentId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "surface_segments"
    WHERE "id" = NEW."approvedSegmentId"
      AND "surfaceId" = NEW."approvedSurfaceId"
  ) THEN
    RAISE EXCEPTION 'approved segment does not belong to approved surface'
      USING ERRCODE = '23514';
  END IF;

  IF (
    NEW."approvedStartAt" IS NOT NULL
    OR NEW."status" IN ('ACCEPTED', 'PARTIALLY_ACCEPTED')
  ) AND (
    NEW."approvedSurfaceId" IS NOT NULL
    OR NEW."approvedSegmentId" IS NOT NULL
  ) AND NOT EXISTS (
    SELECT 1
    FROM "venue_schedule_blocks" block
    WHERE block."id" = NEW."scheduleBlockId"
      AND block."venueId" = NEW."venueId"
      AND (
        block."surfaceId" IS NULL
        OR (
          NEW."approvedSurfaceId" = block."surfaceId"
          AND (
            block."segmentId" IS NULL
            OR NEW."approvedSegmentId" = block."segmentId"
          )
        )
      )
  ) THEN
    RAISE EXCEPTION 'approved space widens or leaves requested space'
      USING ERRCODE = '23514';
  END IF;

  IF (
    NEW."approvedStartAt" IS NOT NULL
    OR NEW."status" IN ('ACCEPTED', 'PARTIALLY_ACCEPTED')
  ) AND NEW."approvedSurfaceId" IS NULL AND EXISTS (
    SELECT 1
    FROM "venue_schedule_blocks" block
    WHERE block."id" = NEW."scheduleBlockId"
      AND block."surfaceId" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'approved space widens requested surface to venue'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "validate_venue_schedule_block_ancestry"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."surfaceId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "venue_surfaces"
    WHERE "id" = NEW."surfaceId" AND "venueId" = NEW."venueId"
  ) THEN
    RAISE EXCEPTION 'venue schedule block surface does not belong to venue'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."segmentId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "surface_segments"
    WHERE "id" = NEW."segmentId" AND "surfaceId" = NEW."surfaceId"
  ) THEN
    RAISE EXCEPTION 'venue schedule block segment does not belong to surface'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Drop the practice planner and hockey-only columns
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS "practice_session_plays";
DROP TABLE IF EXISTS "practice_sessions";
DROP TABLE IF EXISTS "plays";

ALTER TABLE "TeamMember" DROP COLUMN IF EXISTS "usahMemberId";
ALTER TABLE "Player" DROP COLUMN IF EXISTS "usahMemberId";
ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "practicePlanNotifications";

-- ---------------------------------------------------------------------------
-- 3. Sport -> MOTORSPORT only
-- ---------------------------------------------------------------------------
ALTER TABLE "Team" ALTER COLUMN "sport" DROP DEFAULT;
ALTER TABLE "leagues" ALTER COLUMN "sport" DROP DEFAULT;
CREATE TYPE "Sport_new" AS ENUM ('MOTORSPORT');
ALTER TABLE "Team" ALTER COLUMN "sport" TYPE "Sport_new" USING ('MOTORSPORT'::"Sport_new");
ALTER TABLE "leagues" ALTER COLUMN "sport" TYPE "Sport_new" USING ('MOTORSPORT'::"Sport_new");
ALTER TYPE "Sport" RENAME TO "Sport_old";
ALTER TYPE "Sport_new" RENAME TO "Sport";
DROP TYPE "Sport_old";
ALTER TABLE "Team" ALTER COLUMN "sport" SET DEFAULT 'MOTORSPORT';
ALTER TABLE "leagues" ALTER COLUMN "sport" SET DEFAULT 'MOTORSPORT';

-- ---------------------------------------------------------------------------
-- 4. SurfaceType -> CIRCUIT / TRACK / PADDOCK / ROOM / OTHER
-- ---------------------------------------------------------------------------
ALTER TABLE "venues" ALTER COLUMN "surfaceType" DROP DEFAULT;
ALTER TABLE "venue_surfaces" ALTER COLUMN "surfaceType" DROP DEFAULT;
CREATE TYPE "SurfaceType_new" AS ENUM ('CIRCUIT', 'TRACK', 'PADDOCK', 'ROOM', 'OTHER');
ALTER TABLE "venues" ALTER COLUMN "surfaceType" TYPE "SurfaceType_new" USING (
  CASE "surfaceType"::text
    WHEN 'CIRCUIT' THEN 'CIRCUIT'
    WHEN 'TRACK' THEN 'TRACK'
    WHEN 'PADDOCK' THEN 'PADDOCK'
    WHEN 'ROOM' THEN 'ROOM'
    WHEN 'STUDIO' THEN 'ROOM'
    ELSE 'OTHER'
  END
)::"SurfaceType_new";
ALTER TABLE "venue_surfaces" ALTER COLUMN "surfaceType" TYPE "SurfaceType_new" USING (
  CASE "surfaceType"::text
    WHEN 'CIRCUIT' THEN 'CIRCUIT'
    WHEN 'TRACK' THEN 'TRACK'
    WHEN 'PADDOCK' THEN 'PADDOCK'
    WHEN 'ROOM' THEN 'ROOM'
    WHEN 'STUDIO' THEN 'ROOM'
    WHEN 'ICE' THEN 'CIRCUIT'
    ELSE 'OTHER'
  END
)::"SurfaceType_new";
ALTER TYPE "SurfaceType" RENAME TO "SurfaceType_old";
ALTER TYPE "SurfaceType_new" RENAME TO "SurfaceType";
DROP TYPE "SurfaceType_old";
ALTER TABLE "venues" ALTER COLUMN "surfaceType" SET DEFAULT 'OTHER';
ALTER TABLE "venue_surfaces" ALTER COLUMN "surfaceType" SET DEFAULT 'CIRCUIT';

-- ---------------------------------------------------------------------------
-- 5. VenueOrganizationType
-- ---------------------------------------------------------------------------
ALTER TABLE "venue_organizations" ALTER COLUMN "type" DROP DEFAULT;
CREATE TYPE "VenueOrganizationType_new" AS ENUM ('CIRCUIT', 'KART_TRACK', 'DRAG_STRIP', 'MOTORSPORT_COMPLEX', 'OTHER');
ALTER TABLE "venue_organizations" ALTER COLUMN "type" TYPE "VenueOrganizationType_new" USING (
  CASE "type"::text
    WHEN 'RINK' THEN 'CIRCUIT'
    WHEN 'ARENA' THEN 'CIRCUIT'
    WHEN 'SKATING_CENTER' THEN 'KART_TRACK'
    WHEN 'SPORTS_COMPLEX' THEN 'MOTORSPORT_COMPLEX'
    ELSE 'OTHER'
  END
)::"VenueOrganizationType_new";
ALTER TYPE "VenueOrganizationType" RENAME TO "VenueOrganizationType_old";
ALTER TYPE "VenueOrganizationType_new" RENAME TO "VenueOrganizationType";
DROP TYPE "VenueOrganizationType_old";
ALTER TABLE "venue_organizations" ALTER COLUMN "type" SET DEFAULT 'CIRCUIT';

-- ---------------------------------------------------------------------------
-- 6. VenueScheduleActivityType
-- ---------------------------------------------------------------------------
-- The intent-derivation trigger (20260817130000) lists "activityType" in its
-- UPDATE OF clause, and Postgres refuses to retype a column a trigger depends
-- on. Drop it for the swap and recreate it verbatim afterwards.
DROP TRIGGER IF EXISTS "venue_schedule_blocks_intent_trigger" ON "venue_schedule_blocks";
CREATE TYPE "VenueScheduleActivityType_new" AS ENUM ('OPEN_TRACK_DAY', 'TEST_SESSION', 'OPEN_PRACTICE', 'KARTING', 'SPECIALTY_EVENT', 'PRIVATE_COACHING', 'DRIVER_TRAINING', 'TEAM_TEST', 'CLUB_BOOKING', 'RENTAL', 'CLOSURE', 'CUSTOM');
ALTER TABLE "venue_schedule_blocks" ALTER COLUMN "activityType" TYPE "VenueScheduleActivityType_new" USING (
  CASE "activityType"::text
    WHEN 'OPEN_SKATE' THEN 'OPEN_TRACK_DAY'
    WHEN 'STICK_AND_PICK' THEN 'TEST_SESSION'
    WHEN 'FREE_SKATE' THEN 'OPEN_PRACTICE'
    WHEN 'FIGURE_SKATING' THEN 'KARTING'
    WHEN 'SPECIALTY_EVENT' THEN 'SPECIALTY_EVENT'
    WHEN 'PRIVATE_LESSON' THEN 'PRIVATE_COACHING'
    WHEN 'PUBLIC_LESSON' THEN 'DRIVER_TRAINING'
    WHEN 'TEAM_ICE' THEN 'TEAM_TEST'
    WHEN 'ORGANIZATION_ICE' THEN 'CLUB_BOOKING'
    WHEN 'RENTAL' THEN 'RENTAL'
    WHEN 'CLOSURE' THEN 'CLOSURE'
    ELSE 'CUSTOM'
  END
)::"VenueScheduleActivityType_new";
ALTER TYPE "VenueScheduleActivityType" RENAME TO "VenueScheduleActivityType_old";
ALTER TYPE "VenueScheduleActivityType_new" RENAME TO "VenueScheduleActivityType";
DROP TYPE "VenueScheduleActivityType_old";
CREATE TRIGGER "venue_schedule_blocks_intent_trigger"
BEFORE INSERT OR UPDATE OF "intent", "registrationMode", "activityType"
ON "venue_schedule_blocks"
FOR EACH ROW EXECUTE FUNCTION "derive_venue_schedule_block_intent"();

-- ---------------------------------------------------------------------------
-- 7. Skill level sources and disciplines
-- ---------------------------------------------------------------------------
CREATE TYPE "SkillLevelSource_new" AS ENUM ('FMSCI', 'CLUB_CUSTOM', 'OTHER');
ALTER TABLE "skill_level_references" ALTER COLUMN "source" TYPE "SkillLevelSource_new" USING (
  CASE "source"::text
    WHEN 'RINK_CUSTOM' THEN 'CLUB_CUSTOM'
    ELSE 'OTHER'
  END
)::"SkillLevelSource_new";
ALTER TYPE "SkillLevelSource" RENAME TO "SkillLevelSource_old";
ALTER TYPE "SkillLevelSource_new" RENAME TO "SkillLevelSource";
DROP TYPE "SkillLevelSource_old";

CREATE TYPE "SkillLevelDiscipline_new" AS ENUM ('CIRCUIT_RACING', 'KARTING', 'RALLY', 'DRAG_RACING', 'HILL_CLIMB', 'OTHER');
ALTER TABLE "skill_level_references" ALTER COLUMN "discipline" TYPE "SkillLevelDiscipline_new" USING ('OTHER'::"SkillLevelDiscipline_new");
ALTER TYPE "SkillLevelDiscipline" RENAME TO "SkillLevelDiscipline_old";
ALTER TYPE "SkillLevelDiscipline_new" RENAME TO "SkillLevelDiscipline";
DROP TYPE "SkillLevelDiscipline_old";

-- ---------------------------------------------------------------------------
-- 8. AgeClassification: drop the USA Hockey level names
-- ---------------------------------------------------------------------------
ALTER TABLE "signup_events" ALTER COLUMN "ageClassification" DROP DEFAULT;
CREATE TYPE "AgeClassification_new" AS ENUM ('U6', 'U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'JUNIOR', 'ADULT', 'OPEN');
ALTER TABLE "divisions" ALTER COLUMN "ageClassification" TYPE "AgeClassification_new" USING (
  CASE "ageClassification"::text
    WHEN 'SQUIRT_U10' THEN 'U10'
    WHEN 'PEEWEE_U12' THEN 'U12'
    WHEN 'BANTAM_U14' THEN 'U14'
    ELSE "ageClassification"::text
  END
)::"AgeClassification_new";
ALTER TABLE "signup_events" ALTER COLUMN "ageClassification" TYPE "AgeClassification_new" USING (
  CASE "ageClassification"::text
    WHEN 'SQUIRT_U10' THEN 'U10'
    WHEN 'PEEWEE_U12' THEN 'U12'
    WHEN 'BANTAM_U14' THEN 'U14'
    ELSE "ageClassification"::text
  END
)::"AgeClassification_new";
ALTER TYPE "AgeClassification" RENAME TO "AgeClassification_old";
ALTER TYPE "AgeClassification_new" RENAME TO "AgeClassification";
DROP TYPE "AgeClassification_old";
ALTER TABLE "signup_events" ALTER COLUMN "ageClassification" SET DEFAULT 'OPEN';
