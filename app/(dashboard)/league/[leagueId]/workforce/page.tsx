import { notFound } from "next/navigation";
import { Box, Divider, Link as MuiLink, Stack, Typography } from "@mui/material";

import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { Capability, hasCapability } from "@/lib/auth/capabilities";
import { listAssociationResponsibilityGrants } from "@/lib/actions/association-roles";
import { getVolunteerBoard } from "@/lib/actions/volunteers";
import { listVolunteerCredentials } from "@/lib/actions/volunteer-credentials";
import RoleGrantManager from "@/components/features/workforce/RoleGrantManager";
import VolunteerBoard from "@/components/features/workforce/VolunteerBoard";
import CredentialManager from "@/components/features/workforce/CredentialManager";
import { UserPermissionManager } from "@/components/features/admin/UserPermissionManager";
import { TeamPermissionManager } from "@/components/features/admin/TeamPermissionManager";

export const dynamic = "force-dynamic";

/**
 * Workforce: who may do what, and who is staffing the season.
 *
 * Two audiences share this route. Administrators get the delegation surface and
 * the existing membership/role managers; a volunteer with no organizing
 * capability gets only their own shifts. The page never 404s for the second
 * group — having volunteer work is reason enough to be here.
 */
export default async function WorkforcePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const userId = await requireUserId();

  const [canAdminister, volunteerBoard, credentialsResult] = await Promise.all([
    hasCapability({ userId, leagueId, capability: Capability.ADMINISTER_ASSOCIATION }),
    getVolunteerBoard(leagueId),
    listVolunteerCredentials(leagueId),
  ]);

  if (!volunteerBoard.success) {
    notFound();
  }

  const { isOrganizer, needs } = volunteerBoard.data;

  // Deliberately NOT a 404 for members with no shifts: the nav entry is shown
  // to every league user, and a link that 404s is worse than a page saying
  // there is nothing here yet. Non-members are already excluded — the board
  // query is league-scoped and getVolunteerBoard fails for them.

  const [grantsResult, teams, membership] = await Promise.all([
    canAdminister
      ? listAssociationResponsibilityGrants(leagueId)
      : Promise.resolve(null),
    canAdminister || volunteerBoard.data.isOrganizer
      ? prisma.team.findMany({
          where: { leagueId, isActive: true },
          select: { id: true, name: true, sport: true, season: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.leagueUser.findFirst({
      where: { userId, leagueId },
      select: { role: true },
    }),
  ]);

  const [divisions, rounds] = canAdminister
    ? await Promise.all([
        prisma.division.findMany({
          where: { leagueId, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        // Only associations that run a championship have rounds; an empty list
        // hides the race-weekend scope in the delegation form.
        prisma.raceRound.findMany({
          where: { leagueId },
          select: { id: true, name: true, roundNumber: true },
          orderBy: { roundNumber: "asc" },
        }),
      ])
    : [[], []];

  // Only an organizer records a credential against somebody else, so the list
  // of people is loaded only for them.
  const people = credentialsResult.success && credentialsResult.data.isOrganizer
    ? (
        await prisma.leagueUser.findMany({
          where: { leagueId },
          select: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { user: { name: "asc" } },
        })
      ).map((row) => ({
        id: row.user.id,
        name: row.user.name ?? row.user.email,
      }))
    : [];

  const currentUserRole = (membership?.role ?? "MEMBER") as
    | "LEAGUE_ADMIN"
    | "TEAM_ADMIN"
    | "MEMBER";

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="Workforce"
        subtitle={
          canAdminister
            ? "Delegate bounded responsibilities and staff the season with volunteers."
            : "Your volunteer shifts."
        }
      />

      <Stack spacing={4}>
        {canAdminister && grantsResult?.success ? (
          <RoleGrantManager
            leagueId={leagueId}
            grants={grantsResult.data}
            divisions={divisions}
            teams={teams.map((team) => ({ id: team.id, name: team.name }))}
            rounds={rounds.map((round) => ({
              id: round.id,
              name: `Round ${round.roundNumber} — ${round.name}`,
            }))}
          />
        ) : null}

        <Box>
          <Typography variant="h5" component="h2" gutterBottom>
            {isOrganizer ? "Volunteers" : "My shifts"}
          </Typography>
          {isOrganizer ? (
            <Box sx={{ mb: 2 }}>
              {/* A plain link, not a fetch: the route streams the file with a
                  Content-Disposition header and the browser saves it. */}
              <MuiLink
                href={`/api/workforce/export?leagueId=${encodeURIComponent(leagueId)}`}
              >
                Export volunteer roster (CSV)
              </MuiLink>
            </Box>
          ) : null}
          <VolunteerBoard
            leagueId={leagueId}
            teams={teams.map((team) => ({ id: team.id, name: team.name }))}
            needs={needs}
            isOrganizer={isOrganizer}
            currentUserId={userId}
          />
        </Box>

        {credentialsResult.success ? (
          <Box>
            <Typography variant="h5" component="h2" gutterBottom>
              {credentialsResult.data.isOrganizer
                ? "Qualifications"
                : "My qualifications"}
            </Typography>
            <CredentialManager
              leagueId={leagueId}
              credentials={credentialsResult.data.credentials}
              people={people}
              isOrganizer={credentialsResult.data.isOrganizer}
            />
          </Box>
        ) : null}

        {canAdminister ? (
          <>
            <Divider />
            {/*
              Mounted rather than reimplemented: league membership roles and
              team admin membership already have working managers, and a second
              set would be one more place for the two to disagree about who
              holds what.
            */}
            <Box>
              <Typography variant="h5" component="h2" gutterBottom>
                League membership
              </Typography>
              <UserPermissionManager
                leagueId={leagueId}
                currentUserId={userId}
                currentUserRole={currentUserRole}
              />
            </Box>

            <Box>
              <Typography variant="h5" component="h2" gutterBottom>
                Team membership
              </Typography>
              <TeamPermissionManager
                leagueId={leagueId}
                teams={teams}
                currentUserId={userId}
                currentUserRole={currentUserRole}
              />
            </Box>
          </>
        ) : null}
      </Stack>
    </PageContainer>
  );
}
