/**
 * Shared types for championship rounds, results, and standings.
 *
 * These cross the server/client boundary: dates are ISO strings and points are
 * plain numbers (the Prisma Decimal never leaves the server).
 */

export type RaceRoundStatus = "SCHEDULED" | "RESULTS_PENDING" | "FINALIZED";
export type RaceResultStatus = "CLASSIFIED" | "DNF" | "DNS" | "DSQ";

export type RaceResultView = {
  id: string;
  position: number | null;
  points: number;
  status: RaceResultStatus;
  notes: string | null;
  team: { id: string; name: string };
  driver: { id: string; name: string; carNumber: number | null } | null;
};

export type RaceRoundView = {
  id: string;
  name: string;
  roundNumber: number;
  /** Date-only (YYYY-MM-DD) — a race date carries no meaningful time. */
  raceDate: string;
  /** Venue-local timezone, authoritative for reading session times (FR-012). */
  timezone: string;
  status: RaceRoundStatus;
  locationText: string | null;
  notes: string | null;
  venue: { id: string; name: string } | null;
  seasonId: string | null;
  resultCount: number;
};

export type RaceRoundDetail = RaceRoundView & {
  results: RaceResultView[];
};

export type RaceSessionKind =
  | "PRACTICE"
  | "QUALIFYING"
  | "RACE"
  | "SUPPORT"
  | "ADMIN";

export type RaceSessionView = {
  id: string;
  name: string;
  kind: RaceSessionKind;
  /** ISO instants; `timezone` is the venue-local reading to display them in. */
  startAt: string;
  endAt: string;
  timezone: string;
  sortOrder: number;
  notes: string | null;
  venue: { id: string; name: string } | null;
  surface: { id: string; name: string } | null;
  segment: { id: string; name: string } | null;
  /**
   * Whether the session sits inside confirmed venue time. The reservation id
   * itself stays server-side: the timetable only needs to say that space is
   * booked, and the reservation has its own authorized views.
   */
  hasReservation: boolean;
};

export type RaceEntryStatus = "PROVISIONAL" | "CONFIRMED" | "WITHDRAWN";

export type RaceEntryView = {
  id: string;
  carNumber: string | null;
  className: string | null;
  status: RaceEntryStatus;
  notes: string | null;
  team: { id: string; name: string };
  driver: { id: string; name: string } | null;
};

export type StandingsRow = {
  /** Team id, or driver id when grouped by driver. */
  key: string;
  name: string;
  /** Set only for driver standings. */
  teamName: string | null;
  points: number;
  rounds: number;
  wins: number;
  podiums: number;
};

export type ChampionshipStandings = {
  groupBy: "TEAM" | "DRIVER";
  rows: StandingsRow[];
};
