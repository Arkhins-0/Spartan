import { notFound, redirect } from "next/navigation";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";

import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton, LinkCardActionArea } from "@/components/ui/NextLinkComposites";
import {
  getPublicTeamProfile,
  resolvePublicAssociation,
} from "@/lib/actions/association-profile";
import { getPublicTeamScheduleItems } from "@/lib/data/schedule-items";
import { formatDateTime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

/**
 * Public team page.
 *
 * Shows approved team identity and its public news. There is deliberately no
 * entry list here: drivers, guardians, emergency contacts, and race numbers are
 * never selected by publicTeamSummarySelect, so this page cannot render them
 * however it is edited later.
 */
export default async function PublicTeamPage({
  params,
}: {
  params: Promise<{ slug: string; teamSlug: string }>;
}) {
  const { slug, teamSlug } = await params;

  const association = await resolvePublicAssociation(slug);
  if (!association) notFound();
  if (association.canonicalSlug !== slug) {
    redirect(`/associations/${association.canonicalSlug}/teams/${teamSlug}`);
  }

  const team = await getPublicTeamProfile(association.id, teamSlug);
  if (!team) notFound();
  if (team.canonicalSlug !== teamSlug) {
    redirect(`/associations/${association.canonicalSlug}/teams/${team.canonicalSlug}`);
  }

  // Team.leagueId is nullable — teams can exist outside an association — so
  // the relation is optional even though a published one always resolves here.
  const leagueName = team.league?.name ?? "Association";
  const base = `/associations/${association.canonicalSlug}`;
  const now = new Date();
  const scheduleItems = await getPublicTeamScheduleItems(association.id, team.id, {
    from: now,
    to: new Date(now.getTime() + 90 * 86_400_000),
  });

  const subtitle = [leagueName, team.division?.name, team.season].filter(Boolean).join(" · ");

  return (
    <PageContainer maxWidth="md">
      <PageHeader
        icon={
          team.logoUrl ? (
            <Avatar src={team.logoUrl} alt="" variant="rounded" sx={{ width: 40, height: 40 }} />
          ) : (
            <ShieldIcon />
          )
        }
        title={team.name}
        subtitle={subtitle}
        actions={
          <>
            <LinkButton href={base} variant="outlined">
              {leagueName}
            </LinkButton>
            <LinkButton href="#schedule" variant="contained">
              Schedule
            </LinkButton>
          </>
        }
      />

      <Stack spacing={2}>
        {team.publicDescription ? (
          <Typography variant="body1" sx={{ maxWidth: "68ch" }}>
            {team.publicDescription}
          </Typography>
        ) : null}

        <Card id="schedule" component="section" aria-labelledby="team-schedule-heading">
          <CardHeader
            title="Team schedule"
            subheader={`Next 90 days · ${scheduleItems.length} item${scheduleItems.length === 1 ? "" : "s"}`}
            slotProps={{ title: { id: "team-schedule-heading", component: "h2" } }}
          />
          {scheduleItems.length === 0 ? (
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Nothing public is scheduled for this team in the next 90 days.
              </Typography>
            </CardContent>
          ) : (
            <TableContainer sx={{ border: 0, borderRadius: 0, overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 480 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>When</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Venue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scheduleItems.map((item) => (
                    <TableRow key={item.canonicalScheduleId} hover>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(item.startsAt)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{item.title}</TableCell>
                      <TableCell>{item.venueName ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>

        {team.publicContentItems.length > 0 ? (
          <Box component="section" aria-labelledby="team-news-heading">
            <Typography id="team-news-heading" variant="h5" component="h2" sx={{ mb: 1 }}>
              Team news
            </Typography>
            <Stack spacing={1.5}>
              {team.publicContentItems.map((item) => (
                <Card key={item.id}>
                  <LinkCardActionArea href={`${base}/news/${item.slug}`}>
                    <CardContent>
                      <Typography variant="subtitle1" component="h3">
                        {item.title}
                      </Typography>
                      {item.summary ? (
                        <Typography variant="body2" color="text.secondary">
                          {item.summary}
                        </Typography>
                      ) : null}
                    </CardContent>
                  </LinkCardActionArea>
                </Card>
              ))}
            </Stack>
          </Box>
        ) : (
          <EmptyState
            icon={<ShieldIcon />}
            title="No team news yet"
            description="Announcements for this team appear here once they are published."
          />
        )}
      </Stack>
    </PageContainer>
  );
}
