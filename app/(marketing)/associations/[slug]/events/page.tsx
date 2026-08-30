import { notFound, redirect } from "next/navigation";
import {
  Card,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton, LinkMuiLink } from "@/components/ui/NextLinkComposites";
import { prisma } from "@/lib/db/prisma";
import { listPublicSignupEvents } from "@/lib/actions/signup-events";
import { resolveActiveAssociation } from "@/lib/actions/association-profile";
import { AGE_CLASSIFICATION_LABELS } from "@/lib/utils/age-level";
import { formatDateTime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

/**
 * Public event rollup for a league/association (research R9). The slug is
 * minted when the league publishes its first PUBLIC signup event.
 */
export default async function AssociationEventsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Signup events predate public profiles. Resolve retired slugs for any active
  // association without making its draft profile visible.
  const resolved = await resolveActiveAssociation(slug);
  if (!resolved) notFound();

  const league = await prisma.league.findUnique({
    where: { id: resolved.id },
    select: { id: true, name: true, isActive: true },
  });

  if (!league || !league.isActive) {
    notFound();
  }

  if (resolved.canonicalSlug !== slug) {
    redirect(`/associations/${resolved.canonicalSlug}/events`);
  }

  const events = await listPublicSignupEvents({ hostLeagueId: league.id });

  return (
    <PageContainer>
      <PageHeader
        icon={<EventAvailableIcon />}
        title="Events & registration"
        subtitle={`${league.name} · ${events.length} upcoming signup event${events.length === 1 ? "" : "s"}`}
        actions={
          <LinkButton href={`/associations/${resolved.canonicalSlug}`} variant="outlined">
            {league.name}
          </LinkButton>
        }
      />

      {events.length === 0 ? (
        <EmptyState
          icon={<EventAvailableIcon />}
          title="No public events right now"
          description="Check back soon — new signup events appear here as soon as they are published."
        />
      ) : (
        <Card>
          <TableContainer sx={{ border: 0, borderRadius: 0, overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 560 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Event</TableCell>
                  <TableCell>When</TableCell>
                  <TableCell>Where</TableCell>
                  <TableCell>Ages</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <LinkMuiLink href={`/signups/${event.id}`} color="inherit" sx={{ fontWeight: 600 }}>
                          {event.title}
                        </LinkMuiLink>
                        {event.status === "CANCELED" ? (
                          <Chip size="small" color="error" label="Canceled" />
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {formatDateTime(event.startAt, event.timezone)}
                    </TableCell>
                    <TableCell>{event.venue?.name ?? event.locationText ?? "Location TBD"}</TableCell>
                    <TableCell>
                      <Chip size="small" label={AGE_CLASSIFICATION_LABELS[event.ageClassification]} />
                    </TableCell>
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
