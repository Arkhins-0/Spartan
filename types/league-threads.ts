/**
 * Shared types for operational instruction/request threads.
 *
 * These cross the server/client boundary, so every date is an ISO string and
 * no Prisma payload types leak into components.
 */

export type LeagueThreadKind = "INSTRUCTION" | "TEAM_REQUEST";
export type LeagueThreadStatus = "OPEN" | "RESOLVED" | "CLOSED";
export type LeagueThreadTeamStatusValue = "PENDING" | "ACKNOWLEDGED";
export type LeagueThreadEntryKind = "MESSAGE" | "RESOLVE" | "CLOSE" | "REOPEN";
export type LeagueThreadPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type LeagueThreadTeamRef = {
  id: string;
  name: string;
};

export type LeagueThreadTarget = {
  id: string;
  status: LeagueThreadTeamStatusValue;
  respondedAt: string | null;
  team: LeagueThreadTeamRef;
};

export type LeagueThreadEntryView = {
  id: string;
  kind: LeagueThreadEntryKind;
  body: string | null;
  createdAt: string;
  /** Null when the association posted the entry rather than a team. */
  actorTeam: LeagueThreadTeamRef | null;
  actorName: string;
};

export type LeagueThreadView = {
  id: string;
  kind: LeagueThreadKind;
  subject: string;
  body: string;
  priority: LeagueThreadPriority;
  status: LeagueThreadStatus;
  requiresResponse: boolean;
  createdAt: string;
  resolvedAt: string | null;
  /** Set for TEAM_REQUEST threads — the team that raised it. */
  originTeam: LeagueThreadTeamRef | null;
  createdBy: { id: string; name: string };
  /** Per-team response rows; empty for TEAM_REQUEST threads. */
  targets: LeagueThreadTarget[];
  respondedCount: number;
  targetCount: number;
  /** True when the viewing team still owes a reply on this thread. */
  viewerResponsePending: boolean;
  entries: LeagueThreadEntryView[];
};

export type LeagueThreadSummary = {
  threads: LeagueThreadView[];
  /** Null for the association-side inbox, set for a team's own inbox. */
  viewerTeamId: string | null;
};
