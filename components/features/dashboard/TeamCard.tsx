"use client";

import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Stack,
  Button,
  Avatar,
} from "@mui/material";
import { formatSport } from "@/lib/utils/validation";
import {
  People as PeopleIcon,
  Event as EventIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

type TeamCardProps = {
  team: {
    id: string;
    name: string;
    sport: string;
    season: string;
    league?: {
      id: string;
      name: string;
    } | null;
    division?: {
      id: string;
      name: string;
    } | null;
    _count?: {
      players: number;
      events: number;
    };
  };
  role: string;
  showLeagueInfo?: boolean;
  showStats?: boolean;
};

export default function TeamCard({
  team,
  role,
  showLeagueInfo = false,
  showStats = false
}: TeamCardProps) {
  const router = useRouter();

  const handleViewTeam = () => {
    router.push(`/team/${team.id}`);
  };

  const handleManageTeam = () => {
    router.push(`/team/${team.id}/roster`);
  };

  const getTeamInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isAdmin = role === "ADMIN";

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        avatar={<Avatar sx={{ width: 36, height: 36 }}>{getTeamInitials(team.name)}</Avatar>}
        title={team.name}
        subheader={`${formatSport(team.sport)} · ${team.season}`}
        slotProps={{ title: { component: 'h3' } }}
      />

      <CardContent sx={{ flex: 1 }}>
        <Stack spacing={1.5}>
          {/* Membership + league context: chips are grey — none is a status. */}
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip label={isAdmin ? "Team admin" : "Member"} size="small" />
            {showLeagueInfo && team.league && (
              <Chip label={team.league.name} size="small" variant="outlined" />
            )}
            {showLeagueInfo && team.division && (
              <Chip label={`Division: ${team.division.name}`} size="small" variant="outlined" />
            )}
          </Stack>

          {/* Team stats: counts are plain text. */}
          {showStats && team._count && (
            <Stack direction="row" spacing={2} sx={{ color: 'text.secondary' }}>
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <PeopleIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2">
                  {team._count.players} players
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <EventIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2">
                  {team._count.events} events
                </Typography>
              </Stack>
            </Stack>
          )}
        </Stack>
      </CardContent>

      <CardActions>
        <Button size="small" variant="outlined" onClick={handleViewTeam}>
          View team
        </Button>
        {isAdmin && (
          <Button size="small" onClick={handleManageTeam}>
            Manage
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
