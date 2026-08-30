-- The WAITLISTED assignment status.
--
-- Alone in its own migration for the same reason as the RACE_ROUND scope:
-- Postgres will not let a newly added enum value be used in the same
-- transaction that adds it, and the next migration writes it into a CHECK.
ALTER TYPE "VolunteerAssignmentStatus" ADD VALUE IF NOT EXISTS 'WAITLISTED';
