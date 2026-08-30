import { notFound, redirect } from "next/navigation";
import {
  Card,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/NextLinkComposites";
import { resolvePublicAssociation } from "@/lib/actions/association-profile";
import { getPublicAssociationScheduleItems } from "@/lib/data/schedule-items";
import { prisma } from "@/lib/db/prisma";
import { formatDateTime } from "@/lib/utils/date";
import { publicPublishedAssociationWhere } from "@/lib/utils/public-associations";

export const dynamic = "force-dynamic";

/**
 * Canonical public association schedule (feature 007 / User Story 4).
 *
 * Reads through `getPublicAssociationScheduleItems`, which is the canonical
 * reservation-backed reader required by ADR-0007 — this page does not re-derive
 * occupancy from Events, SeasonGames, or schedule blocks, and so cannot show a
 * game twice or disagree with the ICS feed at
 * /api/associations/[slug]/schedule.ics, which reads the same function.
 *
 * `publicOnly` inside that reader is what applies the visibility filter; this
 * page adds no filtering of its own and must not, or the two surfaces would
 * drift apart.
 */
export default async function PublicAssociationSchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = await resolvePublicAssociation(slug);
  if (!resolved) notFound();
  if (resolved.canonicalSlug !== slug) {
    redirect(`/associations/${resolved.canonicalSlug}/schedule`);
  }

  const now = new Date();
  const [association, items] = await Promise.all([
    prisma.league.findFirst({
      where: { ...publicPublishedAssociationWhere, id: resolved.id },
      select: { name: true },
    }),
    getPublicAssociationScheduleItems(resolved.id, {
      from: now,
      to: new Date(now.getTime() + 90 * 86_400_000),
    }),
  ]);
  if (!association) notFound();

  return (
    <PageContainer>
      <PageHeader
        icon={<CalendarMonthIcon />}
        title={`${association.name} schedule`}
        subtitle={`The next 90 days of public activity · ${items.length} item${items.length === 1 ? "" : "s"}`}
        actions={
          <>
            <LinkButton href={`/associations/${resolved.canonicalSlug}`} variant="outlined">
              {association.name}
            </LinkButton>
            <LinkButton
              href={`/api/associations/${resolved.canonicalSlug}/schedule.ics`}
              variant="contained"
            >
              Subscribe (.ics)
            </LinkButton>
          </>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<CalendarMonthIcon />}
          title="Nothing public is scheduled"
          description="No public games, practices or events in the next 90 days."
        />
      ) : (
        <Card>
          <TableContainer sx={{ border: 0, borderRadius: 0, overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow>
                  <TableCell>When</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Division</TableCell>
                  <TableCell>Venue</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.canonicalScheduleId} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(item.startsAt)}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{item.title}</TableCell>
                    <TableCell>
                      {item.teamName ? <Chip size="small" label={item.teamName} /> : "—"}
                    </TableCell>
                    <TableCell>
                      {item.divisionName ? (
                        <Chip size="small" variant="outlined" label={item.divisionName} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{item.venueName ?? "—"}</TableCell>
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
