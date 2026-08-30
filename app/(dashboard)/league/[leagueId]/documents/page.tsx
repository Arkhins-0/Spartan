import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { listDocuments } from "@/lib/actions/documents";
import { isStorageEnabled } from "@/lib/storage";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import DocumentsView from "@/components/features/championship/DocumentsView";

export const dynamic = "force-dynamic";

interface DocumentsPageProps {
  params: Promise<{ leagueId: string }>;
}

/**
 * Official paperwork for the association. Never public: admins see everything,
 * a team admin sees only their own team's filings plus association-wide ones.
 */
export default async function DocumentsPage({ params }: DocumentsPageProps) {
  const { leagueId } = await params;
  const userId = await requireUserId();

  const league = await prisma.league.findFirst({
    where: { id: leagueId, isActive: true },
    select: { id: true, name: true },
  });
  if (!league) {
    notFound();
  }

  const result = await listDocuments({ leagueId });
  if (!result.success) {
    // listDocuments already rejects anyone without admin or team-admin standing.
    notFound();
  }

  const teams = result.data.canUploadForLeague
    ? await prisma.team.findMany({
        where: { leagueId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : (
        await prisma.teamMember.findMany({
          where: { userId, role: "ADMIN", team: { leagueId, isActive: true } },
          select: { team: { select: { id: true, name: true } } },
          orderBy: { team: { name: "asc" } },
        })
      ).map((membership) => membership.team);

  return (
    <PageContainer maxWidth="md">
      <PageHeader
        title="Documents"
        subtitle={`Entry forms, scrutineering, and other paperwork for ${league.name}`}
      />
      <DocumentsView
        leagueId={leagueId}
        documents={result.data.documents}
        teams={teams}
        canUploadForLeague={result.data.canUploadForLeague}
        storageEnabled={isStorageEnabled()}
      />
    </PageContainer>
  );
}
