import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { getLeagueThreads } from "@/lib/actions/league-threads";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import LeagueThreadsView from "@/components/features/championship/LeagueThreadsView";

export const dynamic = "force-dynamic";

interface LeagueThreadsPageProps {
  params: Promise<{ leagueId: string }>;
}

/**
 * Association operations inbox. Instructions issued to teams and requests
 * raised by them share one surface so an admin sees all outstanding work in
 * one place.
 */
export default async function LeagueThreadsPage({ params }: LeagueThreadsPageProps) {
  const { leagueId } = await params;
  const userId = await requireUserId();

  // Only association admins run operations; anyone else gets a 404 rather than
  // a redirect, so league membership is not probeable.
  const leagueAdmin = await prisma.leagueUser.findFirst({
    where: { userId, leagueId, role: "LEAGUE_ADMIN", league: { isActive: true } },
    select: { league: { select: { id: true, name: true } } },
  });

  if (!leagueAdmin) {
    notFound();
  }

  const [threadsResult, teams, divisions] = await Promise.all([
    getLeagueThreads({ leagueId }),
    prisma.team.findMany({
      where: { leagueId, isActive: true },
      select: { id: true, name: true, divisionId: true },
      orderBy: { name: "asc" },
    }),
    prisma.division.findMany({
      where: { leagueId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const threads = threadsResult.success ? threadsResult.data.threads : [];

  return (
    <PageContainer maxWidth="md">
      <PageHeader
        title="Instructions & requests"
        subtitle={`Issue instructions to teams and handle what they raise — ${leagueAdmin.league.name}`}
      />
      <LeagueThreadsView
        leagueId={leagueId}
        threads={threads}
        teams={teams}
        divisions={divisions}
      />
    </PageContainer>
  );
}
