"use client";

import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  Stack,
  Button,
  Avatar,
} from "@mui/material";
import { formatSport } from "@/lib/utils/validation";
import {
  People as PeopleIcon,
  Event as EventIcon,
  Groups as GroupsIcon,
  Category as DivisionIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

interface LeagueOverviewCardProps {
  league: {
    id: string;
    name: string;
    sport: string;
    _count: {
      teams: number;
      players: number;
      events: number;
      divisions: number;
    };
  };
  userRole: 'LEAGUE_ADMIN' | 'TEAM_ADMIN' | 'MEMBER';
  recentActivity?: {
    description: string;
    timestamp: Date;
  };
}

export default function LeagueOverviewCard({
  league,
  userRole,
  recentActivity
}: LeagueOverviewCardProps) {
  const router = useRouter();

  const handleViewLeague = () => {
    // No /league/[leagueId] index route exists — dashboard is the canonical view.
    router.push(`/league/${league.id}/dashboard`);
  };

  const handleManageLeague = () => {
    router.push(`/league/${league.id}/teams`);
  };

  const getLeagueInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'LEAGUE_ADMIN':
        return 'League admin';
      case 'TEAM_ADMIN':
        return 'Team admin';
      default:
        return 'Member';
    }
  };

  const stats = [
    { icon: <GroupsIcon sx={{ fontSize: 16 }} />, label: `${league._count.teams} teams` },
    { icon: <PeopleIcon sx={{ fontSize: 16 }} />, label: `${league._count.players} players` },
    { icon: <EventIcon sx={{ fontSize: 16 }} />, label: `${league._count.events} events` },
    { icon: <DivisionIcon sx={{ fontSize: 16 }} />, label: `${league._count.divisions} divisions` },
  ];

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        avatar={<Avatar sx={{ width: 36, height: 36 }}>{getLeagueInitials(league.name)}</Avatar>}
        title={league.name}
        subheader={formatSport(league.sport)}
        slotProps={{ title: { component: 'h3' } }}
        action={<Chip label={getRoleLabel(userRole)} size="small" />}
      />

      <CardContent sx={{ flex: 1 }}>
        <Stack spacing={1.5}>
          {/* League stats: counts are plain text. */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 1,
              color: 'text.secondary',
            }}
          >
            {stats.map((stat) => (
              <Stack key={stat.label} direction="row" alignItems="center" spacing={0.75}>
                {stat.icon}
                <Typography variant="body2">{stat.label}</Typography>
              </Stack>
            ))}
          </Box>

          {/* Recent activity: a muted step, not a coloured panel. */}
          {recentActivity && (
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'action.hover',
                borderRadius: 1.5,
                border: '1px solid var(--sp-border)',
              }}
            >
              <Typography variant="eyebrow" component="div" color="text.secondary" sx={{ mb: 0.5 }}>
                Recent activity
              </Typography>
              <Typography variant="body2">
                {recentActivity.description}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Intl.DateTimeFormat('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                }).format(recentActivity.timestamp)}
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>

      <CardActions>
        <Button size="small" variant="outlined" onClick={handleViewLeague}>
          View league
        </Button>
        {(userRole === 'LEAGUE_ADMIN' || userRole === 'TEAM_ADMIN') && (
          <Button size="small" onClick={handleManageLeague}>
            Manage
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
