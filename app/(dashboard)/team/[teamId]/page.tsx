import { notFound } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  List,
  Stack,
  Typography,
} from "@mui/material";
import {
  Event as EventIcon,
  Forum as ForumIcon,
  Groups as GroupsIcon,
  People as PeopleIcon,
} from "@mui/icons-material";
import { getTeamOverviewData } from "@/lib/actions/team-context";
import { formatSport } from "@/lib/utils/validation";
import { LinkButton, LinkListItemButton } from "@/components/ui/NextLinkComposites";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

interface TeamPageProps {
  params: Promise<{ teamId: string }>;
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAccessRole(role: string, isAdmin: boolean) {
  switch (role) {
    case "LEAGUE_ADMIN":
      return "League admin";
    case "TEAM_ADMIN":
      return "League team admin";
    default:
      if (isAdmin) return "Team admin";
      return "Member";
  }
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params;
  const team = await getTeamOverviewData(teamId);

  if (!team) {
    notFound();
  }

  const stats = [
    { label: "Players", value: team.stats.players },
    { label: "Events", value: team.stats.events },
    { label: "Members", value: team.stats.members },
  ];

  return (
    <PageContainer>
      <PageHeader
        icon={<GroupsIcon />}
        title={team.name}
        subtitle={`${formatSport(team.sport)} · ${team.season}`}
        actions={
          <>
            <LinkButton
              href={`/team/${team.id}/roster`}
              variant="contained"
              startIcon={<PeopleIcon />}
            >
              {team.isAdmin ? "Manage roster" : "View roster"}
            </LinkButton>
            <LinkButton
              href={`/team/${team.id}/messages`}
              variant="outlined"
              startIcon={<ForumIcon />}
            >
              {team.isAdmin ? "Message team" : "Team messages"}
            </LinkButton>
            {team.league ? (
              <LinkButton
                href={`/league/${team.league.id}/teams`}
                variant="outlined"
                startIcon={<GroupsIcon />}
              >
                League teams
              </LinkButton>
            ) : null}
          </>
        }
      />

      <Stack spacing={2}>
        <Card component="section">
          <CardHeader title="Overview" slotProps={{ title: { component: "h2" } }} />
          <CardContent>
            <Stack spacing={2}>
              {/* Membership and league context: grey chips — none is a status. */}
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={formatAccessRole(team.role, team.isAdmin)} />
                {team.league ? <Chip size="small" label={team.league.name} variant="outlined" /> : null}
                {team.division ? (
                  <Chip size="small" label={`Division: ${team.division.name}`} variant="outlined" />
                ) : null}
              </Stack>

              {/* Counts are plain figures. */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 2,
                }}
              >
                {stats.map((stat) => (
                  <Box key={stat.label}>
                    <Typography variant="scoreboard" component="p">
                      {stat.value}
                    </Typography>
                    <Typography variant="dataLabel" component="p" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card component="section">
          <CardHeader
            title="Upcoming events"
            subheader={
              team.upcomingEvents.length === 0
                ? "Nothing scheduled"
                : `${team.upcomingEvents.length} coming up`
            }
            slotProps={{ title: { component: "h2" } }}
          />

          {team.upcomingEvents.length === 0 ? (
            <CardContent>
              <EmptyState
                icon={<EventIcon />}
                title="No upcoming events"
                description="No upcoming games or practices are scheduled for this team yet."
              />
            </CardContent>
          ) : (
            <List disablePadding sx={{ py: 0.5 }}>
              {team.upcomingEvents.map((event) => {
                const rowSx = {
                  borderRadius: 0,
                  minHeight: 56,
                  px: 2,
                  gap: 1.5,
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "flex-start", sm: "center" },
                } as const;

                const rowContent = (
                  <>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                        {event.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="div">
                        {event.location || "Location TBD"}
                        {event.opponent ? ` · vs. ${event.opponent}` : ""}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                      <Chip size="small" label={event.type === "GAME" ? "Game" : "Practice"} />
                      <Typography variant="caption" color="text.secondary">
                        {formatEventDate(event.startAt)}
                      </Typography>
                    </Stack>
                  </>
                );

                return team.canOpenEventDetails ? (
                  <LinkListItemButton key={event.id} href={`/events/${event.id}`} sx={rowSx}>
                    {rowContent}
                  </LinkListItemButton>
                ) : (
                  <Box
                    key={event.id}
                    sx={{
                      ...rowSx,
                      display: "flex",
                      py: 1,
                      "&:not(:last-child)": { borderBottom: "1px solid var(--sp-border)" },
                    }}
                  >
                    {rowContent}
                  </Box>
                );
              })}
            </List>
          )}
        </Card>
      </Stack>
    </PageContainer>
  );
}
