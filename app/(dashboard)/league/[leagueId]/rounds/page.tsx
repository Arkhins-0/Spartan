import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { getRaceRounds } from "@/lib/actions/race-rounds";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import RaceRoundsView from "@/components/features/championship/RaceRoundsView";

export const dynamic = "force-dynamic";

interface RoundsPageProps {
  params: Promise<{ leagueId: string }>;
}

/** Championship calendar. Any association member may read it; admins edit it. */
export default async function RoundsPage({ params }: RoundsPageProps) {
  const { leagueId } = await params;
  const userId = await requireUserId();

  const membership = await prisma.leagueUser.findFirst({
    where: { userId, leagueId, league: { isActive: true } },
    select: { role: true, league: { select: { name: true } } },
  });

  if (!membership) {
    notFound();
  }

  const canManage = membership.role === "LEAGUE_ADMIN";

  const [roundsResult, venues] = await Promise.all([
    getRaceRounds({ leagueId }),
    prisma.venue.findMany({
      where: { leagueId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <PageContainer maxWidth="md">
      <PageHeader
        title="Rounds"
        subtitle={`Championship calendar for ${membership.league.name}`}
      />
      <RaceRoundsView
        leagueId={leagueId}
        rounds={roundsResult.success ? roundsResult.data : []}
        venues={venues}
        canManage={canManage}
      />
    </PageContainer>
  );
}
