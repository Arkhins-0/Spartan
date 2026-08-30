import { notFound, redirect } from "next/navigation";
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";

import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton, LinkMuiLink } from "@/components/ui/NextLinkComposites";
import {
  getPublicAssociationTeams,
  resolvePublicAssociation,
} from "@/lib/actions/association-profile";
import { prisma } from "@/lib/db/prisma";
import { publicPublishedAssociationWhere } from "@/lib/utils/public-associations";

export const dynamic = "force-dynamic";

/** Public team directory. One activation from the association home (SC-007). */
export default async function PublicAssociationTeamsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = await resolvePublicAssociation(slug);
  if (!resolved) notFound();
  if (resolved.canonicalSlug !== slug) {
    redirect(`/associations/${resolved.canonicalSlug}/teams`);
  }

  const [association, teams] = await Promise.all([
    prisma.league.findFirst({
      where: { ...publicPublishedAssociationWhere, id: resolved.id },
      select: { name: true },
    }),
    getPublicAssociationTeams(resolved.id),
  ]);
  if (!association) notFound();

  return (
    <PageContainer>
      <PageHeader
        icon={<GroupsIcon />}
        title={`${association.name} teams`}
        subtitle={`${teams.length} published team${teams.length === 1 ? "" : "s"}`}
        actions={
          <LinkButton href={`/associations/${resolved.canonicalSlug}`} variant="outlined">
            {association.name}
          </LinkButton>
        }
      />

      {teams.length === 0 ? (
        <EmptyState
          icon={<GroupsIcon />}
          title="No teams published yet"
          description="Teams appear here once the association publishes their public pages."
        />
      ) : (
        <Card>
          <TableContainer sx={{ border: 0, borderRadius: 0, overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 480 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Team</TableCell>
                  <TableCell>Division</TableCell>
                  <TableCell>Season</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id} hover>
                    <TableCell>
                      <LinkMuiLink
                        href={`/associations/${resolved.canonicalSlug}/teams/${team.slug}`}
                        color="inherit"
                        sx={{ fontWeight: 600 }}
                      >
                        {team.name}
                      </LinkMuiLink>
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>{team.division?.name ?? "No division"}</TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>{team.season}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </PageContainer>
  );
}
