import { Suspense } from "react";
import { Box, Card, CardContent, CardHeader, Chip, Stack, Typography } from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Place as PlaceIcon,
} from "@mui/icons-material";
import { LinkButton } from "@/components/ui/NextLinkComposites";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import OnboardingFlow from "@/components/features/onboarding/OnboardingFlow";
import CreateTeamDisclosure from "@/components/features/dashboard/CreateTeamDisclosure";
import TeamCard from "@/components/features/dashboard/TeamCard";
import UpcomingScheduleWidget, {
  UpcomingScheduleWidgetSkeleton,
} from "@/components/features/dashboard/widgets/UpcomingScheduleWidget";
import NeedsRsvpWidget, {
  NeedsRsvpWidgetSkeleton,
} from "@/components/features/dashboard/widgets/NeedsRsvpWidget";
import AdminAttentionWidget, {
  AdminAttentionWidgetSkeleton,
} from "@/components/features/dashboard/widgets/AdminAttentionWidget";
import MyLeaguesWidget, {
  MyLeaguesWidgetSkeleton,
} from "@/components/features/dashboard/widgets/MyLeaguesWidget";
import RecentMessagesWidget, {
  RecentMessagesWidgetSkeleton,
} from "@/components/features/dashboard/widgets/RecentMessagesWidget";
import { getViewerMemberships } from "@/lib/data/dashboard";
import { getTeamVenueRelationships } from "@/lib/actions/venue-relationships";
import { requireUserId } from "@/lib/auth/session";

function pluralize(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export default async function DashboardPage() {
  const userId = await requireUserId();
  const { teams, leagues } = await getViewerMemberships(userId);

  if (teams.length === 0 && leagues.length === 0) {
    return (
      <PageContainer maxWidth="md">
        <OnboardingFlow />
      </PageContainer>
    );
  }

  const isLeagueMode = leagues.length > 0;
  const teamIds = teams.map((membership) => membership.team.id);

  const subtitleParts = [pluralize(teams.length, "team")];
  if (isLeagueMode) subtitleParts.push(pluralize(leagues.length, "league"));

  return (
    <PageContainer>
      <PageHeader
        icon={<DashboardIcon />}
        title={isLeagueMode ? "League dashboard" : "My teams"}
        subtitle={subtitleParts.join(" · ")}
      />

      <Stack spacing={2}>
        {teams.length > 0 && (
          <Box component="section" aria-labelledby="dashboard-teams-heading">
            <Typography
              id="dashboard-teams-heading"
              variant="eyebrow"
              component="h2"
              sx={{ display: "block", mb: 1 }}
            >
              My teams
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                },
                gap: 2,
              }}
            >
              {teams.map((membership) => (
                <TeamCard
                  key={membership.team.id}
                  team={membership.team}
                  role={membership.role}
                  showLeagueInfo={isLeagueMode}
                  showStats
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Widget stack (decision D7 order). Each widget is an independent
            async RSC that streams in behind its own Suspense fallback. */}
        <Suspense fallback={<UpcomingScheduleWidgetSkeleton />}>
          <UpcomingScheduleWidget userId={userId} />
        </Suspense>
        <Suspense fallback={<NeedsRsvpWidgetSkeleton />}>
          <NeedsRsvpWidget userId={userId} />
        </Suspense>
        <Suspense fallback={<AdminAttentionWidgetSkeleton />}>
          <AdminAttentionWidget userId={userId} />
        </Suspense>
        <Suspense fallback={<MyLeaguesWidgetSkeleton />}>
          <MyLeaguesWidget userId={userId} />
        </Suspense>
        {isLeagueMode && (
          <Suspense fallback={<RecentMessagesWidgetSkeleton />}>
            <RecentMessagesWidget userId={userId} />
          </Suspense>
        )}
        <Suspense fallback={null}>
          <VenueRelationshipsSection teamIds={teamIds} />
        </Suspense>

        <CreateTeamDisclosure
          label={teams.length > 0 ? "Create another team" : "Create team"}
        />
      </Stack>
    </PageContainer>
  );
}

async function VenueRelationshipsSection({ teamIds }: { teamIds: string[] }) {
  const venueRelationships = await getTeamVenueRelationships(teamIds);
  if (venueRelationships.length === 0) return null;

  return (
    <Card component="section">
      <CardHeader
        title="Preferred and home rinks"
        subheader={pluralize(venueRelationships.length, "venue")}
        avatar={<PlaceIcon sx={{ color: "text.secondary" }} />}
      />
      <CardContent>
        <Stack spacing={1}>
          {venueRelationships.map((relationship) => (
            <Stack
              key={relationship.id}
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ minHeight: 44 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {relationship.venue.name}
              </Typography>
              <Chip size="small" label={relationship.relationshipType} />
              {relationship.venue.slug ? (
                <LinkButton href={`/rinks/${relationship.venue.slug}`} size="small" sx={{ ml: "auto" }}>
                  View rink
                </LinkButton>
              ) : null}
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
