-- Postgres treats NULLs as distinct in a unique index, so the
-- (roundId, teamId, playerId) key does not dedupe a team-level entry: two rows
-- with no driver both satisfy it. A partial index closes that hole, the same
-- way public_slug_redirects handles its nullable teamId.
CREATE UNIQUE INDEX "race_entries_roundId_teamId_no_driver_key"
  ON "race_entries" ("roundId", "teamId")
  WHERE "playerId" IS NULL;
