"use client";

import React, { useState, useMemo } from 'react';
import { formatSport } from "@/lib/utils/validation";
import {
  Box,
  Typography,
  Button,
  Card,
  CardHeader,
  CardContent,
  Chip,
  Link as MuiLink,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Groups as TeamsIcon,
  Category as DivisionIcon,
  Search as SearchIcon,
  FileDownload as DownloadIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { exportLeagueTeamsToCSV } from '@/lib/utils/csv-export';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import DragDropTeams from './DragDropTeams';
import { DraggableTeamRow } from './DraggableTeamCard';
import { DroppableDivision } from './DroppableDivision';

interface LeagueTeamsViewProps {
  league: {
    id: string;
    name: string;
    sport: string;
    divisions: Array<{
      id: string;
      name: string;
      ageGroup: string | null;
      skillLevel: string | null;
      teams: Array<{
        id: string;
        name: string;
        sport: string;
        season: string;
        createdAt: Date;
        _count: {
          players: number;
          events: number;
        };
      }>;
    }>;
    unassignedTeams: Array<{
      id: string;
      name: string;
      sport: string;
      season: string;
      createdAt: Date;
      _count: {
        players: number;
        events: number;
      };
    }>;
    stats: {
      totalTeams: number;
      totalPlayers: number;
      totalDivisions: number;
    };
  };
}

type TeamRecord = LeagueTeamsViewProps['league']['unassignedTeams'][number];
type SortKey = 'name' | 'players' | 'created';

interface TeamTableProps {
  teams: TeamRecord[];
  leagueId: string;
  /** Names the table for assistive tech, e.g. "Teams in Division A". */
  label: string;
}

/**
 * One dense table of teams. The whole row navigates to the team; the name is
 * also a real link so keyboard and screen-reader users have a focusable
 * target, and the first cell is the drag handle for moving between divisions.
 */
function TeamTable({ teams, leagueId, label }: TeamTableProps) {
  const router = useRouter();

  return (
    <TableContainer sx={{ border: 0, borderRadius: 0 }}>
      <Table aria-label={label} sx={{ minWidth: 560 }}>
        <TableHead>
          <TableRow>
            <TableCell padding="none" sx={{ width: 44 }}>
              <Box component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                Move
              </Box>
            </TableCell>
            <TableCell>Team</TableCell>
            <TableCell align="right">Players</TableCell>
            <TableCell align="right">Events</TableCell>
            <TableCell>Created</TableCell>
            <TableCell align="right" />
          </TableRow>
        </TableHead>
        <TableBody>
          {teams.map((team) => {
            const teamHref = `/league/${leagueId}/teams/${team.id}`;
            return (
              <DraggableTeamRow
                key={team.id}
                id={team.id}
                handleLabel={`Drag ${team.name}`}
                onClick={() => router.push(teamHref)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <MuiLink
                    component={Link}
                    href={teamHref}
                    underline="hover"
                    color="text.primary"
                    onClick={(event: React.MouseEvent) => event.stopPropagation()}
                    sx={{ fontWeight: 600, display: 'inline-block' }}
                  >
                    {team.name}
                  </MuiLink>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {team.season} · {formatSport(team.sport)}
                  </Typography>
                </TableCell>
                <TableCell align="right">{team._count.players}</TableCell>
                <TableCell align="right">{team._count.events}</TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {formatDistanceToNow(new Date(team.createdAt))} ago
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Button
                    size="small"
                    variant="text"
                    component={Link}
                    href={`/league/${leagueId}/teams/${team.id}/roster`}
                    onClick={(event: React.MouseEvent) => event.stopPropagation()}
                  >
                    Roster
                  </Button>
                </TableCell>
              </DraggableTeamRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function LeagueTeamsView({ league }: LeagueTeamsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('name');

  // Flatten all teams for filtering
  const allTeams = useMemo(() => {
    const teamsWithDivision = league.divisions.flatMap(division =>
      division.teams.map(team => ({
        ...team,
        divisionName: division.name,
        divisionId: division.id,
      }))
    );
    const unassigned = league.unassignedTeams.map(team => ({
      ...team,
      divisionName: undefined,
      divisionId: undefined,
    }));
    return [...teamsWithDivision, ...unassigned];
  }, [league.divisions, league.unassignedTeams]);

  // Filter and sort teams
  const filteredTeams = useMemo(() => {
    let filtered = allTeams;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(team =>
        team.name.toLowerCase().includes(query) ||
        team.sport.toLowerCase().includes(query) ||
        formatSport(team.sport).toLowerCase().includes(query) ||
        team.season.toLowerCase().includes(query)
      );
    }

    // Apply division filter
    if (divisionFilter !== 'all') {
      if (divisionFilter === 'unassigned') {
        filtered = filtered.filter(team => !team.divisionId);
      } else {
        filtered = filtered.filter(team => team.divisionId === divisionFilter);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'players':
          return b._count.players - a._count.players;
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [allTeams, searchQuery, divisionFilter, sortBy]);

  // Group filtered teams by division for display
  const groupedTeams = useMemo(() => {
    const groups: Record<string, typeof filteredTeams> = {};

    filteredTeams.forEach(team => {
      const key = team.divisionId || 'unassigned';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(team);
    });

    return groups;
  }, [filteredTeams]);

  // Handle export
  const handleExport = () => {
    const exportData = allTeams.map(team => ({
      name: team.name,
      sport: team.sport,
      season: team.season,
      divisionName: team.divisionName,
      playerCount: team._count.players,
      eventCount: team._count.events,
      createdAt: team.createdAt,
    }));
    exportLeagueTeamsToCSV(exportData, league.name);
  };

  const isFiltering = Boolean(searchQuery) || divisionFilter !== 'all';
  const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;
  const subtitle = [
    plural(league.stats.totalTeams, 'team'),
    plural(league.stats.totalPlayers, 'player'),
    plural(league.stats.totalDivisions, 'division'),
  ].join(' · ');

  return (
    <DragDropTeams
      leagueId={league.id}
      divisions={league.divisions}
      unassignedTeams={league.unassignedTeams}
    >
      {() => (
        <PageContainer>
          <PageHeader
            icon={<TeamsIcon />}
            title="Teams"
            subtitle={subtitle}
            actions={
              <>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleExport}
                >
                  Export CSV
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DivisionIcon />}
                  component={Link}
                  href={`/league/${league.id}/divisions`}
                >
                  Manage divisions
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  component={Link}
                  href={`/league/${league.id}/teams/new`}
                >
                  Add team
                </Button>
              </>
            }
          />

          <Stack spacing={2}>
            {/* Search, then filters on their own line so they wrap freely. */}
            <Stack spacing={1.5}>
              <TextField
                placeholder="Search teams…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                data-search-input
                fullWidth
                slotProps={{
                  input: {
                    'aria-label': 'Search teams',
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ maxWidth: { sm: 360 } }}
              />

              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 1,
                  rowGap: 1,
                }}
              >
                <Box
                  role="group"
                  aria-label="Filter by division"
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}
                >
                  <Chip
                    label="All divisions"
                    size="small"
                    variant={divisionFilter === 'all' ? 'filled' : 'outlined'}
                    onClick={() => setDivisionFilter('all')}
                    aria-pressed={divisionFilter === 'all'}
                  />
                  {league.divisions.map(division => (
                    <Chip
                      key={division.id}
                      label={division.name}
                      size="small"
                      variant={divisionFilter === division.id ? 'filled' : 'outlined'}
                      onClick={() => setDivisionFilter(division.id)}
                      aria-pressed={divisionFilter === division.id}
                    />
                  ))}
                  <Chip
                    label="Unassigned"
                    size="small"
                    variant={divisionFilter === 'unassigned' ? 'filled' : 'outlined'}
                    onClick={() => setDivisionFilter('unassigned')}
                    aria-pressed={divisionFilter === 'unassigned'}
                  />
                </Box>

                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={sortBy}
                  onChange={(_event, value: SortKey | null) => {
                    if (value) setSortBy(value);
                  }}
                  aria-label="Sort teams"
                  sx={{ ml: { sm: 'auto' } }}
                >
                  <ToggleButton value="name">Name</ToggleButton>
                  <ToggleButton value="players">Players</ToggleButton>
                  <ToggleButton value="created">Newest</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {isFiltering && (
                <Typography variant="body2" color="text.secondary">
                  Showing {filteredTeams.length} of {allTeams.length} teams
                  {searchQuery && ` matching "${searchQuery}"`}
                </Typography>
              )}
            </Stack>

            {/* Divisions with filtered teams */}
            {league.divisions.map((division) => {
              const divisionTeams = groupedTeams[division.id] || [];

              // Skip division if no teams match filter
              if (divisionFilter !== 'all' && divisionFilter !== division.id && divisionTeams.length === 0) {
                return null;
              }

              const meta = [division.ageGroup, division.skillLevel, plural(divisionTeams.length, 'team')]
                .filter(Boolean)
                .join(' · ');

              return (
                <Card key={division.id} component="section" aria-labelledby={`division-${division.id}-title`}>
                  <CardHeader
                    title={division.name}
                    subheader={meta}
                    slotProps={{ title: { id: `division-${division.id}-title`, component: 'h2' } }}
                    action={
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<AddIcon />}
                        component={Link}
                        href={`/league/${league.id}/teams/new?divisionId=${division.id}`}
                      >
                        Add team
                      </Button>
                    }
                  />
                  <DroppableDivision id={division.id} isEmpty={divisionTeams.length === 0}>
                    {divisionTeams.length === 0 ? (
                      <CardContent>
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                          {isFiltering
                            ? 'No teams match your search in this division'
                            : 'No teams in this division yet — drop one here or add a team'}
                        </Typography>
                      </CardContent>
                    ) : (
                      <TeamTable
                        teams={divisionTeams}
                        leagueId={league.id}
                        label={`Teams in ${division.name}`}
                      />
                    )}
                  </DroppableDivision>
                </Card>
              );
            })}

            {/* Unassigned Teams */}
            {(() => {
              const unassignedTeams = groupedTeams['unassigned'] || [];

              if (divisionFilter !== 'all' && divisionFilter !== 'unassigned' && unassignedTeams.length === 0) {
                return null;
              }

              // Only show the unassigned drop target when there are teams to
              // file, or divisions to move teams out of.
              if (unassignedTeams.length === 0 && league.unassignedTeams.length === 0 && league.divisions.length === 0) {
                return null;
              }

              return (
                <Card component="section" aria-labelledby="division-unassigned-title">
                  <CardHeader
                    title="Other teams"
                    subheader={`Not assigned to any division · ${plural(unassignedTeams.length, 'team')}`}
                    slotProps={{ title: { id: 'division-unassigned-title', component: 'h2' } }}
                  />
                  <DroppableDivision id="unassigned" isEmpty={unassignedTeams.length === 0}>
                    {unassignedTeams.length === 0 ? (
                      <CardContent>
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                          {isFiltering
                            ? 'No unassigned teams match your search'
                            : 'Drop a team here to remove it from its division'}
                        </Typography>
                      </CardContent>
                    ) : (
                      <TeamTable
                        teams={unassignedTeams}
                        leagueId={league.id}
                        label="Teams not assigned to a division"
                      />
                    )}
                  </DroppableDivision>
                </Card>
              );
            })()}

            {/* Empty State */}
            {league.stats.totalTeams === 0 && (
              <EmptyState
                icon={<TeamsIcon />}
                title="No teams yet"
                description="Get started by creating your first team in this league."
                action={
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    component={Link}
                    href={`/league/${league.id}/teams/new`}
                  >
                    Create first team
                  </Button>
                }
              />
            )}
          </Stack>
        </PageContainer>
      )}
    </DragDropTeams>
  );
}
