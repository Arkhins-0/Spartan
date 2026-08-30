import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { getTeamThreads } from "@/lib/actions/league-threads";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import TeamThreadsView from "@/components/features/championship/TeamThreadsView";
import ForumIcon from "@mui/icons-material/Forum";
import type { LeagueThreadView } from "@/types/league-threads";

export const dynamic = "force-dynamic";

/**
 * Team-side operations inbox: instructions this team was sent, and requests it
 * raised with the association. Mirrors how /seasons/proposals exposes the
 * team's view of a league-scoped workflow.
 */
export default async function TeamThreadsPage() {
  const userId = await requireUserId();

  // Threads are an association workflow, so only teams inside a league qualify.
  const memberships = await prisma.teamMember.findMany({
    where: {
      userId,
      role: "ADMIN",
      team: { isActive: true, leagueId: { not: null } },
    },
    select: { team: { select: { id: true, name: true, leagueId: true } } },
    orderBy: { team: { name: "asc" } },
  });

  const teams = memberships
    .map((membership) => membership.team)
    .filter((team): team is { id: string; name: string; leagueId: string } =>
      Boolean(team.leagueId)
    );

  if (teams.length === 0) {
    return (
      <PageContainer maxWidth="md">
        <PageHeader title="Instructions & requests" />
        <EmptyState
          icon={<ForumIcon />}
          title="No association teams"
          description="Instructions and requests appear here once you administer a team that belongs to an association."
        />
      </PageContainer>
    );
  }

  const results = await Promise.all(
    teams.map((team) => getTeamThreads({ teamId: team.id }))
  );

  const threadsByTeam: Record<string, LeagueThreadView[]> = {};
  teams.forEach((team, index) => {
    const result = results[index];
    threadsByTeam[team.id] = result.success ? result.data.threads : [];
  });

  return (
    <PageContainer maxWidth="md">
      <PageHeader
        title="Instructions & requests"
        subtitle="Instructions from your association, and requests you have raised."
      />
      <TeamThreadsView teams={teams} threadsByTeam={threadsByTeam} />
    </PageContainer>
  );
}
