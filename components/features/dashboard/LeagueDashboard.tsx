"use client";

import React from 'react';
import { formatSport } from "@/lib/utils/validation";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Stack,
} from '@mui/material';
import {
  Groups as TeamsIcon,
  People as PlayersIcon,
  Event as EventIcon,
  Category as DivisionIcon,
  Add as AddIcon,
  Schedule as ScheduleIcon,
  Announcement as AnnouncementIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  Payments as PaymentsIcon,
  Forum as ForumIcon,
  Flag as FlagIcon,
  EmojiEvents as StandingsIcon,
  Description as DescriptionIcon,
  EmojiEvents as LeagueIcon,
} from '@mui/icons-material';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface LeagueDashboardProps {
  league: {
    id: string;
    name: string;
    sport: string;
    contactEmail: string;
    contactPhone: string | null;
    createdAt: Date;
    stats: {
      totalTeams: number;
      totalPlayers: number;
      totalEvents: number;
      upcomingEvents: number;
      activeDivisions: number;
    };
    recentActivity: Array<{
      id: string;
      type: 'team_created' | 'player_added' | 'event_scheduled' | 'division_created';
      description: string;
      timestamp: Date;
      teamName?: string;
      playerName?: string;
      eventTitle?: string;
      divisionName?: string;
    }>;
    upcomingEvents: Array<{
      id: string;
      title: string;
      startAt: Date;
      location: string;
      teamName: string;
      homeTeamName?: string;
      awayTeamName?: string;
      type: string;
    }>;
    divisions: Array<{
      id: string;
      name: string;
      ageGroup: string | null;
      skillLevel: string | null;
      teamCount: number;
    }>;
  };
}

export default function LeagueDashboard({ league }: LeagueDashboardProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'team_created':
        return <TeamsIcon fontSize="small" />;
      case 'player_added':
        return <PlayersIcon fontSize="small" />;
      case 'event_scheduled':
        return <EventIcon fontSize="small" />;
      case 'division_created':
        return <DivisionIcon fontSize="small" />;
      default:
        return <TrendingUpIcon fontSize="small" />;
    }
  };

  const stats = [
    { label: 'Teams', value: league.stats.totalTeams },
    { label: 'Players', value: league.stats.totalPlayers },
    { label: 'Events', value: league.stats.totalEvents },
    { label: 'Upcoming', value: league.stats.upcomingEvents },
    { label: 'Divisions', value: league.stats.activeDivisions },
  ];

  const quickActions: Array<{ label: string; href: string; icon: React.ReactNode }> = [
    { label: 'Schedule', href: `/league/${league.id}/schedule/new-game`, icon: <ScheduleIcon /> },
    { label: 'Announce', href: `/league/${league.id}/messages`, icon: <AnnouncementIcon /> },
    { label: 'Divisions', href: `/league/${league.id}/divisions`, icon: <DivisionIcon /> },
    { label: 'Stats', href: `/league/${league.id}/statistics`, icon: <AssessmentIcon /> },
    { label: 'Reports', href: `/league/${league.id}/reports`, icon: <DownloadIcon /> },
    { label: 'Payments', href: `/league/${league.id}/payments`, icon: <PaymentsIcon /> },
    { label: 'Instructions', href: `/league/${league.id}/threads`, icon: <ForumIcon /> },
    { label: 'Rounds', href: `/league/${league.id}/rounds`, icon: <FlagIcon /> },
    { label: 'Standings', href: `/league/${league.id}/standings`, icon: <StandingsIcon /> },
    { label: 'Documents', href: `/league/${league.id}/documents`, icon: <DescriptionIcon /> },
  ];

  return (
    <PageContainer>
      <PageHeader
        icon={<LeagueIcon />}
        title={league.name}
        subtitle={`${formatSport(league.sport)} · created ${formatDistanceToNow(new Date(league.createdAt))} ago`}
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={Link}
            href={`/league/${league.id}/teams/new`}
          >
            Add team
          </Button>
        }
      />

      <Stack spacing={2}>
        {/* Stats overview: counts are plain text on one card. */}
        <Card component="section">
          <CardHeader title="At a glance" slotProps={{ title: { component: 'h2' } }} />
          <CardContent>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(5, 1fr)',
                },
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
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card component="section">
          <CardHeader title="Quick actions" slotProps={{ title: { component: 'h2' } }} />
          <CardContent>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
                gap: 1,
              }}
            >
              {quickActions.map((action) => (
                <Button
                  key={action.href}
                  variant="outlined"
                  startIcon={action.icon}
                  component={Link}
                  href={action.href}
                  fullWidth
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* Content grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
          }}
        >
          {/* Upcoming events */}
          <Card component="section">
            <CardHeader
              title="Upcoming events"
              slotProps={{ title: { component: 'h2' } }}
              action={
                <Button size="small" component={Link} href={`/league/${league.id}/schedule`}>
                  View all
                </Button>
              }
            />
            <CardContent>
              {league.upcomingEvents.length === 0 ? (
                <EmptyState icon={<EventIcon />} title="No upcoming events" description="Nothing is scheduled yet." />
              ) : (
                <List dense disablePadding>
                  {league.upcomingEvents.map((event, index) => (
                    <React.Fragment key={event.id}>
                      <ListItem sx={{ px: 0, py: 1.25 }}>
                        <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>
                          <EventIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box>
                              <Typography variant="body2" component="div" sx={{ fontWeight: 600 }}>
                                {event.title}
                              </Typography>
                              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ color: 'text.secondary', mt: 0.25 }}>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  <TimeIcon sx={{ fontSize: 14 }} />
                                  <Typography variant="caption">
                                    {format(new Date(event.startAt), 'MMM d, h:mm a')}
                                  </Typography>
                                </Stack>
                                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                                  <LocationIcon sx={{ fontSize: 14 }} />
                                  <Typography variant="caption" noWrap>
                                    {event.location}
                                  </Typography>
                                </Stack>
                              </Stack>
                            </Box>
                          }
                          secondary={
                            event.homeTeamName && event.awayTeamName
                              ? `${event.homeTeamName} vs ${event.awayTeamName}`
                              : event.teamName
                          }
                          slotProps={{ primary: { component: 'div' } }}
                        />
                      </ListItem>
                      {index < league.upcomingEvents.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card component="section">
            <CardHeader title="Recent activity" slotProps={{ title: { component: 'h2' } }} />
            <CardContent>
              {league.recentActivity.length === 0 ? (
                <EmptyState icon={<TrendingUpIcon />} title="No recent activity" />
              ) : (
                <List dense disablePadding>
                  {league.recentActivity.map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ListItem sx={{ px: 0, py: 1.25 }}>
                        <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>
                          {getActivityIcon(activity.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={activity.description}
                          secondary={formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        />
                      </ListItem>
                      {index < league.recentActivity.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Divisions overview */}
        {league.divisions.length > 0 && (
          <Card component="section">
            <CardHeader
              title="Divisions"
              subheader={`${league.divisions.length} division${league.divisions.length === 1 ? '' : 's'}`}
              slotProps={{ title: { component: 'h2' } }}
              action={
                <Button size="small" component={Link} href={`/league/${league.id}/teams`}>
                  Manage teams
                </Button>
              }
            />
            <CardContent>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                  gap: 1.5,
                }}
              >
                {league.divisions.map((division) => (
                  <Box
                    key={division.id}
                    sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid var(--sp-border)' }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }} gutterBottom>
                      {division.name}
                    </Typography>
                    {(division.ageGroup || division.skillLevel) && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
                        {division.ageGroup && <Chip label={division.ageGroup} size="small" />}
                        {division.skillLevel && (
                          <Chip label={division.skillLevel} size="small" variant="outlined" />
                        )}
                      </Stack>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {division.teamCount} {division.teamCount === 1 ? 'team' : 'teams'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}
      </Stack>
    </PageContainer>
  );
}
