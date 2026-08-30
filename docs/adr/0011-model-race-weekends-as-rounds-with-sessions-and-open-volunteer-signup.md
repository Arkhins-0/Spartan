---
schemaVersion: 0.1.0
id: "0011"
title: "Model race weekends as rounds with sessions and open volunteer signup"
status: accepted
date: 2026-08-30
created: 2026-08-30
deciders: ["@Arkhins-0"]
tags: [architecture, racing, workforce, authorization, associations]
scope: org
reversibility: two-way-door
blastRadius: org
relatesTo: ["0002", "0003", "0007", "0008", "0009"]
affects:
  - type: path
    pattern: "lib/actions/race-sessions.ts"
    note: Sessions occupy space only through a confirmed reservation.
  - type: path
    pattern: "lib/actions/race-entries.ts"
    note: Entry list keyed the same way as RaceResult.
  - type: path
    pattern: "lib/actions/race-rounds.ts"
    note: Round writes authorize through MANAGE_SCHEDULE, not LeagueUser.role.
  - type: path
    pattern: "lib/actions/volunteers.ts"
    note: Open signup, waiting list, check-in, and the credential/waiver gates.
  - type: path
    pattern: "lib/actions/volunteer-credentials.ts"
    note: Credentials are references, never documents.
  - type: path
    pattern: "lib/actions/round-waivers.ts"
    note: Versioned waiver wording with per-version acceptance.
  - type: path
    pattern: "lib/services/volunteer-reminders.ts"
    note: Paged, budgeted, idempotent reminder materialization.
  - type: path
    pattern: "lib/services/volunteer-outbox-worker.ts"
    note: A second, deliberately smaller outbox drain for volunteer.* events.
  - type: path
    pattern: "lib/auth/capability-matrix.ts"
    note: The RACE_ROUND scope and the roles that may hold it.
  - type: path
    pattern: "prisma/**"
    note: RaceSession, RaceEntry, VolunteerCredential, RoundWaiver, and the
      rewritten grant scope CHECK.
provenance:
  authoredBy: agent-drafted
  ratifiedBy: "@Arkhins-0"
review:
  tier: async
  tierReason: >-
    It adds a scope to the authorization model of ADR-0009 and a second
    notification drain alongside the one ADR-0006 established; either could
    become a permissive default or a divergent contract if unreviewed.
reviewBy: 2027-02-28
---

# ADR-0011: Model race weekends as rounds with sessions and open volunteer signup

## Context

Spartan already runs championships: `RaceRound` holds a calendar entry and
`RaceResult` a multi-entrant grid, with standings summed at read time. What it
could not do is *run* a race weekend.

A weekend is not a fixture. It spans days, contains a timetable of sessions
(practice, qualifying, races, plus sign-on and scrutineering), carries an entry
list of cars distinct from the results sheet, and — the part that actually
consumes an organizing committee — is worked by dozens of marshals and officials
allocated to physical posts.

Three concrete gaps forced this:

1. **`VolunteerNeed` could not attach to a round at all.** Its scope columns
   stopped at division, team, `Event`, and `SignupEvent`. A race weekend could
   not be staffed inside the product that owns the championship.

2. **Volunteers could not sign themselves up.** `assignVolunteer` created an
   `INVITED` row, one person at a time, typed in by a coordinator. Racing clubs
   do not work this way: they publish posts and marshals claim them, weeks
   ahead, with a waiting list when a popular post fills. Benchmarking against
   MotorsportReg, Playpass, and the published marshalling processes of BRSCC,
   BARC, VSCC, ICSCC and SCCA showed open signup and post allocation to be the
   universal shape, not a nice-to-have.

3. **`race-rounds.ts` authorized on `LeagueUser.role === "LEAGUE_ADMIN"`.**
   That predates ADR-0009 and quietly contradicts it: a delegated `SCHEDULER`
   could not touch a championship, and there was no way to hand one race weekend
   to one person — exactly the least-privilege case ADR-0009 exists to serve.

Racing also brings two obligations hockey did not: marshals hold graded
qualifications, and everyone signs a waiver.

## Decision

We will treat a race weekend as a `RaceRound` with a timetable, an entry list,
and a workforce, and staff it by publication rather than by invitation.

1. **Extend `RaceRound`; do not create a parallel event type.** `RaceSession`
   and `RaceEntry` hang off the round. `SignupEvent` was not reused: it is built
   around registration and payment, not competition.

2. **A session never creates a claim on space.** When it occupies venue time it
   names a reservation the venue already confirmed, and its venue, surface, and
   segment are *copied from that reservation* rather than typed in beside it, so
   the two cannot disagree (ADR-0007, FR-007/FR-008). Several sessions
   deliberately share one reservation: booking a circuit for the day and running
   four sessions inside it is one occupancy, not four. A session with no
   reservation is a paper timetable entry.

3. **`RaceEntry` uses the same key as `RaceResult`** — (round, team, driver) —
   so a results sheet can be seeded from entries without a second identity
   scheme for the same car. `carNumber` is text on the entry, not the integer
   `Player.carNumber`: "07" is not 7, and a driver may run a different number in
   a different class.

4. **Extend `VolunteerNeed`; do not create a `MarshalPost` model.** Capacity,
   lifecycle states, the atomic claim, and the scoped-organizer read model were
   already right. What was added is a round/session scope, `signupMode`,
   `waitlistEnabled`, `postLabel`, and `briefingAt`.

5. **Open signup reuses the proven claim.** `claimVolunteerShift` takes a slot
   with the same conditional `updateMany` guarded on
   `acceptedCount < capacity` that `respondToVolunteerAssignment` already used,
   falling back to `WAITLISTED` when the guard matches zero rows. ADR-0003 rules
   out `SELECT … FOR UPDATE`, and this needs no lock.

6. **Waitlist order is arrival order.** No stored position: a number would have
   to be rewritten on every promotion and could drift from the truth, while
   `createdAt` cannot. Releasing an accepted slot promotes the head of the queue
   *in the same transaction*, so freed capacity is never briefly visible to a
   later arrival.

7. **Claiming is authorized by association membership, not by a capability.**
   A published post is published to the association. Organizing a shift and
   working one are different jobs.

8. **Credentials are references, never documents.** A grade, a licence number,
   an expiry. Verifying a governing body's licence is out of scope for spec 007,
   and storing scans would pull identity documents into a system that does not
   need them and could not stay free to self-host with them (ADR-0008). Expiry
   is advisory: it blocks a *new* self-claim and warns an organizer, and never
   stands anybody down.

9. **An organizer may assign past a credential gate, and the exception is
   recorded.** Pairing a trainee with an experienced marshal is normal practice;
   preventing it would be wrong, and allowing it silently would be worse.

10. **Waiver wording is versioned, and acceptance names the version.** Editing
    published wording bumps the version, which invalidates prior acceptances for
    gating while leaving the old records intact. The model follows
    `ParentalConsent` — versioned text, denormalized signer, a record that
    outlives the account — but does not reuse it: `ParentalConsent` is
    COPPA-specific and counsel-versioned, and diluting it would make both harder
    to reason about.

11. **`RACE_ROUND` joins the ADR-0009 scope model**, and the scope `CHECK` is
    rewritten with an `ELSE false` branch. The original `CASE` had no `ELSE`, so
    a row at any scope added later evaluated to `NULL` and the constraint
    passed. It now fails closed, as ADR-0009 §2 always intended.

12. **Round writes authorize through `MANAGE_SCHEDULE`**, scoped to the round.
    Creating a round deliberately passes no scope target, so a round-scoped
    grant cannot invent another round.

## Options considered

### Option A: Extend `RaceRound` and `VolunteerNeed` (chosen)

| Dimension | Assessment |
|---|---|
| Occupancy correctness | Reuses the canonical reservation; no second claim path (ADR-0007) |
| Concurrency | Reuses a claim already proven under a real database |
| Authorization | One new scope in an existing allowlist; nothing new fails open |
| Migration cost | Six migrations, all additive; no data rewrite |
| Model sprawl | Four new models, each with one job |

### Option B: Model a race weekend as a `SignupEvent`

**Pros:** registration, payments, capacity, waitlist, gallery, and public
visibility already exist; almost nothing new to build.
**Cons:** `SignupEvent` is a *registration* aggregate. A race weekend's entry
list is not a registration list (entries are recorded by officials, not
self-served and paid for), and its timetable is not an event window. Standings
and results already key off `RaceRound`, so a weekend would live in one model
and its results in another, joined by nothing. Payment configuration would
become load-bearing for clubs that take entries offline.

### Option C: A dedicated `MarshalPost` model for workforce

**Pros:** a model shaped exactly like a marshal post, with no `INVITE_ONLY`
legacy to carry.
**Cons:** a second staffing system beside `VolunteerNeed`, with its own
capacity arithmetic, its own concurrency guarantee to prove, its own scoped
read model, and its own place on the workforce board — for an association that
runs both a hockey season and a championship, two boards that disagree.

### Option D: Do nothing

Race weekends continue to be staffed on a spreadsheet emailed around the
committee, which is what the platform exists to replace, and rounds remain
unreachable for every delegated role.

## Trade-offs

- **`VolunteerNeed` now carries racing-shaped fields** (`postLabel`,
  `briefingAt`, `requiredCredentialKind`) that a hockey association will leave
  null. The alternative was two models; a few nullable columns is the cheaper
  wrong-looking thing.
- **A second outbox drain.** `volunteer.*` events are delivered by
  `volunteer-outbox-worker.ts` rather than the gear worker, because the gear
  worker is bound to the gear notification registry, its payload contracts, and
  its digest/ordering semantics — none of which a single-recipient shift
  reminder has. The cost is a second retry/dead-letter implementation to keep
  correct. The alternative — registering volunteer events in the gear
  registry — would have been a lie about what they are.
- **Open signup widens board visibility.** A need published `OPEN_SIGNUP` is
  now readable by any association member, where before a volunteer saw only
  needs they held an assignment on. Deliberate: an unclaimable post is an
  unfilled post. Whose *names* are visible did not change — the assignment
  filter still restricts a non-organizer to their own row.
- **`postLabel` is free text**, so the day sheet groups on a string an organizer
  can typo. Every circuit names its posts differently and no enumeration would
  survive contact with a second club.
- **Credential expiry gates nothing already granted.** A club that wants hard
  enforcement on the day does not get it here.

## Consequences

- **Easier:** staffing a race weekend without a spreadsheet; handing one weekend
  to one event manager; printing a post-allocation sheet; knowing on the
  dashboard that a weekend has no posts yet.
- **Harder:** two notification drains to keep in step; a `VolunteerNeed` that
  now serves two sports' vocabularies.
- **How we would know this was wrong:** if a second sport needs a third set of
  scope columns on `VolunteerNeed`, the "extend, do not fork" call has failed
  and the model should become a polymorphic activity reference. If the two
  outbox workers drift — different retry semantics, different dead-letter
  behaviour — the "keep them separate" call has failed and they should be
  unified behind one registry. Concretely: a third `*-outbox-worker.ts`, or a
  fourth scope column, is the trigger.
- **Revisit if:** volunteer events acquire digesting or preference suppression,
  at which point they need the gear worker's machinery and duplicating it is no
  longer defensible.

## Action items

1. [ ] Backfill `RaceRound.startAt`/`endAt` for existing rounds, or leave them
       null and let `raceDate` remain the headline — decide once a real
       championship has more than one round on file.
2. [ ] Watch whether `requiredCredentialLabel` free-text matching produces
       misses in practice; if it does, promote common grades to a lookup.
3. [ ] Revisit the shared-vs-separate outbox worker question when the third
       consumer appears.
