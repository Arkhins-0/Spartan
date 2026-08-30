-- CreateEnum
CREATE TYPE "VolunteerSignupMode" AS ENUM ('INVITE_ONLY', 'OPEN_SIGNUP');

-- CreateEnum
CREATE TYPE "VolunteerAssignmentSource" AS ENUM ('ASSIGNED', 'SELF_CLAIMED', 'PROMOTED_FROM_WAITLIST');

-- AlterTable
ALTER TABLE "volunteer_assignments" ADD COLUMN     "briefingAckAt" TIMESTAMP(3),
ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "source" "VolunteerAssignmentSource" NOT NULL DEFAULT 'ASSIGNED';

-- AlterTable
ALTER TABLE "volunteer_needs" ADD COLUMN     "briefingAt" TIMESTAMP(3),
ADD COLUMN     "postLabel" TEXT,
ADD COLUMN     "signupMode" "VolunteerSignupMode" NOT NULL DEFAULT 'INVITE_ONLY',
ADD COLUMN     "waitlistEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "volunteer_assignments_needId_status_createdAt_idx" ON "volunteer_assignments"("needId", "status", "createdAt");

-- One person holds at most one live assignment per need, so a second claim
-- cannot quietly take a second slot. Partial on both counts: an email-only
-- invitation has a NULL userId, which Postgres treats as distinct, and a
-- declined or cancelled assignment should not block signing up again later.
CREATE UNIQUE INDEX "volunteer_assignments_one_live_per_person_key"
  ON "volunteer_assignments" ("needId", "userId")
  WHERE "userId" IS NOT NULL
    AND "status" IN ('INVITED', 'ACCEPTED', 'WAITLISTED', 'COMPLETED');

-- Check-in belongs to a shift somebody actually holds; a declined assignment
-- with a check-in time would make the day sheet lie about who turned up.
ALTER TABLE "volunteer_assignments"
  ADD CONSTRAINT "volunteer_assignments_checkin_requires_slot_check"
  CHECK (
    "checkedInAt" IS NULL
    OR "status" IN ('ACCEPTED', 'COMPLETED', 'MISSED')
  );

-- A briefing happens before the shift it briefs.
ALTER TABLE "volunteer_needs"
  ADD CONSTRAINT "volunteer_needs_briefing_before_shift_check"
  CHECK ("briefingAt" IS NULL OR "briefingAt" <= "endAt");
