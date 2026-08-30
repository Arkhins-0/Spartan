-- The RACE_ROUND grant scope.
--
-- Alone in its own migration on purpose: Postgres forbids *using* a newly added
-- enum value in the same transaction that adds it, and the next migration
-- rewrites the association_role_grants scope CHECK to name RACE_ROUND.
ALTER TYPE "AssociationRoleScopeType" ADD VALUE IF NOT EXISTS 'RACE_ROUND';
