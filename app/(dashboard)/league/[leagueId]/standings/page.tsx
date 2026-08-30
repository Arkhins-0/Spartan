import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { getChampionshipStandings } from "@/lib/actions/race-rounds";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import StandingsTable from "@/components/features/championship/StandingsTable";
import type { ChampionshipStandings } from "@/types/race-rounds";

export const dynamic = "force-dynamic";

interface StandingsPageProps {
  params: Promise<{ leagueId: string }>;
}

const EMPTY = (groupBy: "TEAM" | "DRIVER"): ChampionshipStandings => ({
  groupBy,
  rows: [],
});

/** Championship points table, summed from recorded round results on read. */
export default async function StandingsPage({ params }: StandingsPageProps) {
  const { leagueId } = await params;
  const userId = await requireUserId();

  const membership = await prisma.leagueUser.findFirst({
    where: { userId, leagueId, league: { isActive: true } },
    select: { league: { select: { name: true } } },
  });

  if (!membership) {
    notFound();
  }

  const [teamResult, driverResult] = await Promise.all([
    getChampionshipStandings({ leagueId, groupBy: "TEAM" }),
    getChampionshipStandings({ leagueId, groupBy: "DRIVER" }),
  ]);

  return (
    <PageContainer maxWidth="md">
      <PageHeader
        title="Standings"
        subtitle={`Championship points for ${membership.league.name}`}
      />
      <StandingsTable
        teamStandings={teamResult.success ? teamResult.data : EMPTY("TEAM")}
        driverStandings={driverResult.success ? driverResult.data : EMPTY("DRIVER")}
      />
    </PageContainer>
  );
}
