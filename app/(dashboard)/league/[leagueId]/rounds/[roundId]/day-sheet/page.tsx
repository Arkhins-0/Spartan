import { notFound } from "next/navigation";
import { Box, Divider, Stack, Typography } from "@mui/material";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { Capability, hasCapability } from "@/lib/auth/capabilities";
import { PageContainer } from "@/components/ui/PageContainer";
import { LinkButton } from "@/components/ui/NextLinkComposites";

export const dynamic = "force-dynamic";

interface DaySheetPageProps {
  params: Promise<{ leagueId: string; roundId: string }>;
}

/**
 * The post-allocation sheet a Chief Marshal carries on the day.
 *
 * Paper, not a dashboard: grouped by post, then by time, with a box to tick as
 * each person signs on. Deliberately plain — it is printed, photocopied, and
 * read outdoors, so it uses no colour to carry meaning and no interaction.
 *
 * Organizer-only. It lists names, phone-usable emails, and who is covered by a
 * credential exception; none of that belongs on a page any member can open.
 */
export default async function DaySheetPage({ params }: DaySheetPageProps) {
  const { leagueId, roundId } = await params;
  const userId = await requireUserId();

  const round = await prisma.raceRound.findFirst({
    where: { id: roundId, leagueId },
    select: { id: true, name: true, roundNumber: true, raceDate: true, timezone: true },
  });
  if (!round) {
    notFound();
  }

  const canOrganize = await hasCapability({
    userId,
    leagueId,
    capability: Capability.MANAGE_VOLUNTEERS,
    roundId,
  });
  if (!canOrganize) {
    notFound();
  }

  const needs = await prisma.volunteerNeed.findMany({
    where: { leagueId, roundId, status: { not: "CANCELED" } },
    select: {
      id: true,
      roleLabel: true,
      postLabel: true,
      capacity: true,
      startAt: true,
      endAt: true,
      timezone: true,
      briefingAt: true,
      requiredCredentialLabel: true,
      session: { select: { name: true } },
      assignments: {
        where: { status: { in: ["ACCEPTED", "COMPLETED"] } },
        select: {
          id: true,
          credentialWaivedAt: true,
          checkedInAt: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
    orderBy: [{ startAt: "asc" }],
  });

  // Group by post, because that is how the sheet is used: one section per
  // physical location, handed to whoever is running it.
  const byPost = new Map<string, typeof needs>();
  for (const need of needs) {
    const key = need.postLabel ?? "Unassigned post";
    const bucket = byPost.get(key) ?? [];
    bucket.push(need);
    byPost.set(key, bucket);
  }
  const posts = [...byPost.entries()].sort(([a], [b]) => a.localeCompare(b));

  function time(value: Date, timezone: string): string {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(value);
  }

  const raceDate = new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    dateStyle: "full",
  }).format(round.raceDate);

  return (
    <PageContainer maxWidth="md">
      {/*
        Screen-only chrome. `@media print` drops it so the printed sheet starts
        at the heading, and the page prints in black on white whatever theme the
        organizer happens to be using.
      */}
      <style>{`
        @media print {
          .day-sheet-noprint { display: none !important; }
          .day-sheet { color: #000; background: #fff; }
          .day-sheet-post { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <Box className="day-sheet-noprint" sx={{ mb: 3 }}>
        <LinkButton href={`/league/${leagueId}/rounds/${roundId}`}>
          Back to the round
        </LinkButton>
      </Box>

      <Box className="day-sheet">
        <Typography variant="h4" component="h1">
          Post allocation — Round {round.roundNumber}, {round.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {raceDate} · all times {round.timezone}
        </Typography>

        {posts.length === 0 ? (
          <Typography sx={{ mt: 3 }} color="text.secondary">
            Nobody is rostered for this weekend yet.
          </Typography>
        ) : null}

        {posts.map(([post, postNeeds]) => (
          <Box key={post} className="day-sheet-post" sx={{ mt: 4 }}>
            <Typography variant="h5" component="h2">
              {post}
            </Typography>
            <Divider sx={{ mb: 1 }} />

            {postNeeds.map((need) => (
              <Box key={need.id} sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {need.roleLabel}
                  {need.session ? ` — ${need.session.name}` : ""}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {time(need.startAt, need.timezone)}–{time(need.endAt, need.timezone)}
                  {need.briefingAt
                    ? ` · briefing ${time(need.briefingAt, need.timezone)}`
                    : ""}
                  {` · ${need.assignments.length} of ${need.capacity}`}
                  {need.requiredCredentialLabel
                    ? ` · requires ${need.requiredCredentialLabel}`
                    : ""}
                </Typography>

                <Stack component="ul" sx={{ pl: 3, mt: 0.5, mb: 0 }} spacing={0.25}>
                  {need.assignments.map((assignment) => (
                    <Typography component="li" variant="body2" key={assignment.id}>
                      {/* A literal box to tick with a pen; the recorded
                          check-in is shown when it already happened. */}
                      {assignment.checkedInAt ? "[x] " : "[ ] "}
                      {assignment.user?.name ?? assignment.user?.email ?? "Unnamed"}
                      {assignment.user?.email ? ` · ${assignment.user.email}` : ""}
                      {assignment.credentialWaivedAt ? " · working under supervision" : ""}
                    </Typography>
                  ))}

                  {/* Blank lines for the shortfall, so somebody can be written
                      in at the gate rather than remembered. */}
                  {Array.from(
                    { length: Math.max(need.capacity - need.assignments.length, 0) },
                    (_, index) => (
                      <Typography
                        component="li"
                        variant="body2"
                        color="text.secondary"
                        key={`blank-${index}`}
                      >
                        [ ] ________________________________
                      </Typography>
                    ),
                  )}
                </Stack>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </PageContainer>
  );
}
