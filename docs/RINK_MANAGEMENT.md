# Circuit Management

Spartan circuit management lets authorized venue staff publish a public circuit profile, manage track layouts and schedules, accept track-time requests, publish training programmes and circuit content, maintain preferred/home venue relationships, and tag programmes with optional skill levels.

## Manager workflow

1. Create a venue organization from `/venue-admin/new`, then manage the venue profile at `/venue-admin/[organizationId]/venues/[venueId]/profile`.
2. Add active track surfaces (full circuit, short course, kart track, paddock area) before publishing schedule blocks. Existing legacy venues receive a default `Main Surface` through the backfill migration.
3. Publish public schedule blocks from `/schedule`; overlapping published blocks are rejected, while drafts can be prepared independently.
4. Review track-time requests from `/requests`; accepted requests prevent double-booking within the same schedule block.
5. Publish training programmes, specialty events, and venue posts from `/content`; only published public content is rendered on public circuit pages.
6. Manage preferred/home circuit relationships from `/relationships`; target team or championship admins must accept invitations before public/team surfaces display them.
7. Use skill-level labels as optional guidance for programmes and schedule blocks. Public visitors can filter schedules by level.

## Public surfaces

- `/circuits` lists published public circuit profiles (the legacy `/rinks` paths redirect here permanently).
- `/circuits/[slug]` shows public-safe profile details, upcoming schedule, programmes, posts, specialty events, and accepted relationships.
- `/circuits/[slug]/schedule` shows published public future schedule blocks, requestable track-time blocks, and optional skill-level filters.

Private manager notes, unpublished profiles, draft content, staff-only schedule blocks, emergency-style sensitive fields, and pending/removed relationships are not exposed on public circuit pages.
