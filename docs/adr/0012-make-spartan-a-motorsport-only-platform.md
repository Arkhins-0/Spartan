---
schemaVersion: 0.1.0
id: "0012"
title: "Make Spartan a motorsport-only platform"
status: accepted
date: 2026-08-30
created: 2026-08-30
deciders: ["@Arkhins-0"]
tags: [architecture, product-scope, racing, venues, data-model]
scope: org
reversibility: one-way-door
blastRadius: org
relatesTo: ["0003", "0007", "0011"]
affects:
  - type: path
    pattern: "prisma/**"
    note: Sport is a single-value enum; surface, activity, skill and org enums
      carry motorsport vocabulary; VenueSurface and SurfaceTimeRequest are the
      canonical names.
  - type: path
    pattern: "lib/utils/sport-catalog.ts"
    note: One catalog entry. Do not reintroduce per-sport branching.
  - type: path
    pattern: "lib/utils/validation.ts"
    note: SPORTS, SURFACE_TYPES, activity/skill/org lists mirror the schema.
  - type: path
    pattern: "lib/utils/segment-presets.ts"
    note: Segmentation presets are keyed by CIRCUIT/PADDOCK, not ICE/COURT.
  - type: path
    pattern: "lib/actions/venue-surfaces.ts"
    note: Operates on VenueSurface (formerly IceSurface).
  - type: path
    pattern: "lib/actions/venue-requests.ts"
    note: Operates on SurfaceTimeRequest (formerly IceTimeRequest).
  - type: path
    pattern: "components/features/venue-admin/**"
    note: Venue UI vocabulary is circuit/track/paddock.
  - type: path
    pattern: "app/(marketing)/**"
    note: Public copy leads with motorsport; /rinks is /circuits.
  - type: path
    pattern: "lib/email/templates.ts"
    note: Transactional copy is motorsport copy.
provenance:
  authoredBy: agent-drafted
  ratifiedBy: "@Arkhins-0"
review:
  tier: arb
  tierReason: >-
    Narrows the product to one sport, deletes shipped features (practice
    planner, USA Hockey export) and rewrites live enums with a destructive
    migration; there is no automated path back.
reviewBy: 2027-08-30
---

# ADR-0012: Make Spartan a motorsport-only platform

## Context

Spartan began as a hockey team-management tool and grew a multi-sport
`Sport` enum with hockey as the default and the only sport with a full
capability entry. Motorsport was later added as a first-class sport
(ADR-0011: `RaceRound`, `RaceSession`, `RaceEntry`, `RaceResult`, open
volunteer signup, `Player.fmsciLicenseNumber`/`carNumber`/`racingClass`),
but the product still *led* with ice: `Team.sport` and `League.sport`
defaulted to `HOCKEY`, the venue model was named `IceSurface` and
`IceTimeRequest`, venue organizations were `RINK`s, schedule blocks were
`OPEN_SKATE` and `STICK_AND_PICK`, skill ladders came from `USA_HOCKEY`, age
groups were `SQUIRT`/`PEEWEE`/`BANTAM`, and the marketing site mentioned
"ice" over a hundred times.

The owner's direction is that Spartan is *purely* a motorsport platform — not
hockey, not football, not equestrian — so the multi-sport surface is no longer
a feature to preserve. Every branch of "which sport is this?" is dead weight
that costs test coverage, copy consistency, and onboarding clarity, and every
hockey-only feature (a rink-diagram practice planner, a USA Hockey jersey
roster export, figure-skating and goalie skill disciplines) is a feature a
racing club will never use but must still read past.

## Decision

We will make motorsport the only sport Spartan models, and say so in the
schema, the code, and the public copy.

1. **`Sport` collapses to `{ MOTORSPORT }`.** The column stays so sport-aware
   code paths keep a stable typed key, but there is one value and one catalog
   entry. Sport pickers are removed from team/league forms.
2. **Hockey-named-but-generic models are renamed, not replaced:**
   `IceSurface → VenueSurface` (`venue_surfaces`), `IceTimeRequest →
   SurfaceTimeRequest` (`surface_time_requests`),
   `IceTimeRequestStatus → SurfaceTimeRequestStatus`. Data is preserved via
   `ALTER TABLE … RENAME`.
3. **Rink vocabulary in enums becomes motorsport vocabulary** with a
   row-mapping migration: `SurfaceType` is `CIRCUIT | TRACK | PADDOCK | ROOM |
   OTHER`; `VenueOrganizationType` is `CIRCUIT | KART_TRACK | DRAG_STRIP |
   MOTORSPORT_COMPLEX | OTHER`; `VenueScheduleActivityType` maps
   `OPEN_SKATE → OPEN_TRACK_DAY`, `STICK_AND_PICK → TEST_SESSION`,
   `FREE_SKATE → OPEN_PRACTICE`, `FIGURE_SKATING → KARTING`,
   `PRIVATE_LESSON → PRIVATE_COACHING`, `PUBLIC_LESSON → DRIVER_TRAINING`,
   `TEAM_ICE → TEAM_TEST`, `ORGANIZATION_ICE → CLUB_BOOKING`;
   `SkillLevelSource` is `FMSCI | CLUB_CUSTOM | OTHER`; `SkillLevelDiscipline`
   is `CIRCUIT_RACING | KARTING | RALLY | DRAG_RACING | HILL_CLIMB | OTHER`;
   `AgeClassification` drops the USA Hockey level names (`SQUIRT_U10 → U10`,
   `PEEWEE_U12 → U12`, `BANTAM_U14 → U14`).
4. **Hockey-only features are deleted**, not left dormant: the practice
   planner (`PracticeSession`, `PracticeSessionPlay`, `Play`, the rink board
   and canvas utilities, `practicePlanNotifications`) and the USA Hockey
   member ID / jersey roster export (`usahMemberId` on `Player` and
   `TeamMember`, spec 001).
5. **Public copy leads with motorsport.** The `/rinks` directory becomes
   `/circuits` (the dashboard already owns `/venues`) with a permanent
   redirect; marketing pages, email templates,
   README, SEO description and the web manifest describe championships,
   race weekends, circuits, paddocks and marshals.

## Options considered

### Option A: Motorsport-only, delete hockey features, rename in place (chosen)

| Dimension | Assessment |
|---|---|
| Product clarity | One sport, one vocabulary, no "which sport?" branches. |
| Data safety | Renames and row-mapped enum rewrites preserve existing rows. |
| Blast radius | Large one-off diff (≈100 files), but mechanical and reviewable. |
| Reversibility | One-way: dropped tables and columns are gone; reintroducing a sport means a new decision. |

### Option B: Motorsport as default, other sports dormant

Flip `@default(HOCKEY)` to `MOTORSPORT`, keep every enum value and every
hockey feature reachable but hidden.

**Pros:** smallest diff; nothing is lost.
**Cons:** the codebase keeps every `sport === "HOCKEY"` branch, the tests keep
covering them, `OPEN_SKATE` keeps showing up in a circuit operator's schedule
picker, and the rink-diagram practice planner keeps shipping in the bundle.
The product would still *be* a hockey app with a motorsport skin. This was the
step-1 state and was explicitly rejected by the owner.

### Option C: Fork — a new motorsport product alongside Spartan

**Pros:** no destructive migration.
**Cons:** two products to maintain for one owner and one audience; ADR-0011's
racing model already lives here.

### Option D: Do nothing

Leaves hockey as the default and the public copy leading with ice, which
contradicts what the product is for.

## Trade-offs

- **One-way door.** `plays`, `practice_sessions`, `usahMemberId` and the old
  enum values are dropped. A future second sport would need a fresh decision
  and a fresh migration, not a revert.
- **Vocabulary mapping is lossy.** Existing schedule blocks typed
  `FIGURE_SKATING` become `KARTING` and skill references collapse to `OTHER`
  discipline; on a real rink database this would be wrong, which is
  acceptable only because there is no such customer.
- **The `Sport` enum is now a one-value column.** It is kept for typing
  stability rather than removed; that is a small oddity in the schema.
- **`VenueSurface` keeps `wholeLabel`, segments and coexistence** designed for
  half-ice sharing. They still make sense for paddocks and multi-configuration
  circuits, but the presets are now a guess rather than a proven use case.

## Consequences

- Easier: writing copy, forms and tests — there is one sport. Venue admin
  screens read correctly for a circuit operator. New contributors are not
  misled by `IceSurface` into thinking the venue model is hockey-specific.
- Harder: supporting any second sport. Restoring the practice planner would
  be a re-implementation.
- **How we would know this was wrong:** a paying or self-hosting user asks for
  a non-motorsport sport, or the segment presets for `CIRCUIT`/`PADDOCK` are
  never used and the segmentation feature (006) should be removed too.
- Revisit if: the owner's product direction changes, or by `reviewBy`.

## Action items

1. [x] Migration `20260830170000_motorsport_only_platform` written (renames,
   row-mapped enum rewrites, drops).
2. [ ] Apply the migration to every environment (`bun run db:migrate:deploy`);
   it is destructive and was not auto-applied.
3. [x] Ratify ADR-0011.
4. [ ] Remove `IceSurfaceType`-style aliases in `types/venue-management.ts`
   once nothing references them.
