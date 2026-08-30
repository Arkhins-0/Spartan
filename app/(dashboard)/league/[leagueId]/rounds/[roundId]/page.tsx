import { notFound } from "next/navigation";
import { Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { Capability, hasCapability } from "@/lib/auth/capabilities";
import { getRoundResults } from "@/lib/actions/race-rounds";
import { getRaceSessions } from "@/lib/actions/race-sessions";
import { getRaceEntries } from "@/lib/actions/race-entries";
import { getRoundWaiver } from "@/lib/actions/round-waivers";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Link as MuiLink } from "@mui/material";
import { LinkButton } from "@/components/ui/NextLinkComposites";
import RaceResultsEntry from "@/components/features/championship/RaceResultsEntry";
import RoundTabs from "@/components/features/championship/RoundTabs";
import SessionTimetable from "@/components/features/championship/SessionTimetable";
import EntryListEditor from "@/components/features/championship/EntryListEditor";
import RoundWaiverPanel from "@/components/features/championship/RoundWaiverPanel";

export const dynamic = "force-dynamic";

interface RoundDetailPageProps {
  params: Promise<{ leagueId: string; roundId: string }>;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: "UTC",
  dateStyle: "full",
});

/**
 * One race weekend: its timetable, entry list, and results.
 *
 * Authority comes from MANAGE_SCHEDULE scoped to this round, not from league
 * admin membership. A round-scoped event manager sees the same editing surface
 * as an association admin, and only for their own weekend — which is the point
 * of delegating one.
 */
export default async function RoundDetailPage({ params }: RoundDetailPageProps) {
  const { leagueId, roundId } = await params;
  const userId = await requireUserId();

  const membership = await prisma.leagueUser.findFirst({
    where: { userId, leagueId, league: { isActive: true } },
    select: { role: true },
  });

  if (!membership) {
    notFound();
  }

  const [
    roundResult,
    sessionsResult,
    entriesResult,
    waiverResult,
    canManage,
    canOrganizeVolunteers,
  ] = await Promise.all([
    getRoundResults({ roundId }),
    getRaceSessions({ roundId }),
    getRaceEntries({ roundId }),
    getRoundWaiver(roundId),
    hasCapability({
      userId,
      leagueId,
      capability: Capability.MANAGE_SCHEDULE,
      roundId,
    }),
    // The day sheet carries names and contact addresses, so it answers to
    // volunteer authority rather than to scheduling authority.
    hasCapability({
      userId,
      leagueId,
      capability: Capability.MANAGE_VOLUNTEERS,
      roundId,
    }),
  ]);

  if (!roundResult.success) {
    notFound();
  }
  const round = roundResult.data;
  const sessions = sessionsResult.success ? sessionsResult.data : [];
  const entries = entriesResult.success ? entriesResult.data : [];
  const waiver = waiverResult.success ? waiverResult.data : null;

  const [teams, drivers] = canManage
    ? await Promise.all([
        prisma.team.findMany({
          where: { leagueId, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.player.findMany({
          where: { team: { leagueId, isActive: true } },
          select: { id: true, name: true, teamId: true, carNumber: true },
          orderBy: { name: "asc" },
        }),
      ])
    : [[], []];

  const results = canManage ? (
    <RaceResultsEntry round={round} teams={teams} drivers={drivers} />
  ) : round.results.length === 0 ? (
    <Typography color="text.secondary">
      Results have not been published for this round yet.
    </Typography>
  ) : (
    <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Pos</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Entrant</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Team</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Points
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {round.results.map((result) => (
            <TableRow key={result.id} hover>
              <TableCell>
                {result.position ?? (
                  <Chip size="small" variant="outlined" label={result.status} />
                )}
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                  {result.driver?.carNumber != null && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`#${result.driver.carNumber}`}
                    />
                  )}
                  <Typography variant="body2">
                    {result.driver?.name ?? result.team.name}
                  </Typography>
                </Stack>
              </TableCell>
              <TableCell>{result.team.name}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {result.points}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <PageContainer maxWidth="md">
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 3, flexWrap: "wrap", gap: 1 }}
      >
        <LinkButton href={`/league/${leagueId}/rounds`} startIcon={<ArrowBackIcon />}>
          Back to rounds
        </LinkButton>
        {canOrganizeVolunteers ? (
          <LinkButton href={`/league/${leagueId}/rounds/${roundId}/day-sheet`}>
            Day sheet
          </LinkButton>
        ) : null}
        {/* A plain link, not a fetch: the route streams the file with a
            Content-Disposition header and the browser saves it. */}
        <MuiLink
          href={`/api/rounds/export?roundId=${encodeURIComponent(roundId)}`}
          sx={{ alignSelf: "center", minHeight: 44, display: "inline-flex", alignItems: "center" }}
        >
          Export entry list (CSV)
        </MuiLink>
      </Stack>

      <PageHeader
        title={`Round ${round.roundNumber} — ${round.name}`}
        subtitle={`${dateFormatter.format(new Date(`${round.raceDate}T00:00:00.000Z`))}${
          round.venue ? ` · ${round.venue.name}` : round.locationText ? ` · ${round.locationText}` : ""
        }`}
      />

      <RoundTabs
        tabs={[
          {
            value: "timetable",
            label: `Timetable${sessions.length ? ` (${sessions.length})` : ""}`,
            content: (
              <SessionTimetable
                roundId={roundId}
                sessions={sessions}
                canManage={canManage}
                timezone={round.timezone}
              />
            ),
          },
          {
            value: "entries",
            label: `Entries${entries.length ? ` (${entries.length})` : ""}`,
            content: (
              <EntryListEditor
                roundId={roundId}
                entries={entries}
                teams={teams}
                drivers={drivers}
                canManage={canManage}
              />
            ),
          },
          {
            value: "waiver",
            label:
              waiver?.published && !waiver.acceptedByViewer
                ? "Waiver — action needed"
                : "Waiver",
            content: (
              <RoundWaiverPanel
                roundId={roundId}
                waiver={waiver}
                canManage={canManage}
              />
            ),
          },
          { value: "results", label: "Results", content: results },
        ]}
      />
    </PageContainer>
  );
}
