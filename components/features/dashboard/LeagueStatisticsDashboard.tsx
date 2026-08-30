"use client";

import React from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Chip,
    LinearProgress,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import {
    Assessment as AssessmentIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';

interface LeagueStatisticsDashboardProps {
    statistics: {
        overview: {
            totalTeams: number;
            totalPlayers: number;
            totalEvents: number;
            upcomingEvents: number;
            activeDivisions: number;
        };
        participation: {
            totalRSVPs: number;
            goingCount: number;
            notGoingCount: number;
            maybeCount: number;
            noResponseCount: number;
            participationRate: number;
        };
        attendance: {
            byTeam: Array<{
                teamId: string;
                teamName: string;
                totalEvents: number;
                averageAttendance: number;
                goingRate: number;
            }>;
            byDivision: Array<{
                divisionId: string;
                divisionName: string;
                totalEvents: number;
                averageAttendance: number;
                goingRate: number;
            }>;
            overall: {
                totalEvents: number;
                averageAttendance: number;
                goingRate: number;
            };
        };
        trends: {
            monthlyActivity: Array<{
                month: string;
                teamsCreated: number;
                playersAdded: number;
                eventsScheduled: number;
            }>;
            participationTrend: Array<{
                month: string;
                participationRate: number;
                totalRSVPs: number;
            }>;
        };
    };
}

/** Flat stat tile: a small label over a large tabular figure. */
function StatTile({ label, value, helper }: { label: string; value: React.ReactNode; helper?: string }) {
    return (
        <Card>
            <CardHeader title={label} />
            <CardContent>
                <Typography variant="scoreboard" component="p">
                    {value}
                </Typography>
                {helper ? (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        {helper}
                    </Typography>
                ) : null}
            </CardContent>
        </Card>
    );
}

/** Attendance band as a status chip; colour only where it reports a state. */
function RateChip({ goingRate, totalEvents }: { goingRate: number; totalEvents: number }) {
    if (totalEvents === 0) return <Chip label="No events" size="small" variant="outlined" />;
    if (goingRate >= 70) return <Chip label="Excellent" color="success" size="small" />;
    if (goingRate >= 50) return <Chip label="Good" size="small" />;
    if (goingRate >= 30) return <Chip label="Fair" color="warning" size="small" />;
    return <Chip label="Low" color="error" size="small" />;
}

export default function LeagueStatisticsDashboard({ statistics }: LeagueStatisticsDashboardProps) {
    const { overview, participation, attendance, trends } = statistics;

    // Calculate trend direction for participation
    const getTrendDirection = () => {
        if (trends.participationTrend.length < 2) return null;
        const latest = trends.participationTrend[trends.participationTrend.length - 1];
        const previous = trends.participationTrend[trends.participationTrend.length - 2];
        return latest.participationRate > previous.participationRate ? 'up' : 'down';
    };

    const trendDirection = getTrendDirection();

    const subtitle = [
        `${overview.totalTeams} teams`,
        `${overview.totalPlayers} players`,
        `${overview.totalEvents} events`,
        `${participation.participationRate}% participation`,
    ].join(' · ');

    return (
        <PageContainer>
            <PageHeader
                icon={<AssessmentIcon />}
                title="Statistics"
                subtitle={subtitle}
            />

            <Stack spacing={2}>
                {/* Participation Overview */}
                <Card>
                    <CardHeader
                        title="Participation"
                        subheader={`Based on ${participation.totalRSVPs} RSVPs across all events`}
                    />
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Overall participation rate
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="scoreboard" component="span" sx={{ fontSize: '1.25rem' }}>
                                    {participation.participationRate}%
                                </Typography>
                                {trendDirection === 'up' && (
                                    <TrendingUpIcon color="success" fontSize="small" titleAccess="Trending up" />
                                )}
                                {trendDirection === 'down' && (
                                    <TrendingDownIcon color="error" fontSize="small" titleAccess="Trending down" />
                                )}
                            </Box>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={participation.participationRate}
                            aria-label="Overall participation rate"
                        />
                    </CardContent>
                </Card>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                        gap: 2,
                    }}
                >
                    <StatTile label="Going" value={participation.goingCount} />
                    <StatTile label="Not going" value={participation.notGoingCount} />
                    <StatTile label="Maybe" value={participation.maybeCount} />
                    <StatTile label="No response" value={participation.noResponseCount} />
                </Box>

                {/* Attendance by Team */}
                <Card>
                    <CardHeader
                        title="Attendance by team"
                        subheader={`${attendance.byTeam.length} teams · ${attendance.overall.goingRate}% going overall`}
                    />
                    <TableContainer sx={{ border: 0, borderRadius: 0 }}>
                        <Table aria-label="Attendance by team" sx={{ minWidth: 520 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Team</TableCell>
                                    <TableCell align="right">Events</TableCell>
                                    <TableCell align="right">Avg attendance</TableCell>
                                    <TableCell align="right">Going rate</TableCell>
                                    <TableCell align="right">Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {attendance.byTeam.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                                No team data available
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    attendance.byTeam.map((team) => (
                                        <TableRow key={team.teamId} hover>
                                            <TableCell sx={{ fontWeight: 600 }}>{team.teamName}</TableCell>
                                            <TableCell align="right">{team.totalEvents}</TableCell>
                                            <TableCell align="right">{team.averageAttendance}</TableCell>
                                            <TableCell align="right">{team.goingRate}%</TableCell>
                                            <TableCell align="right">
                                                <RateChip goingRate={team.goingRate} totalEvents={team.totalEvents} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>

                {/* Attendance by Division */}
                {attendance.byDivision.length > 0 && (
                    <Card>
                        <CardHeader
                            title="Attendance by division"
                            subheader={`${attendance.byDivision.length} divisions`}
                        />
                        <TableContainer sx={{ border: 0, borderRadius: 0 }}>
                            <Table aria-label="Attendance by division" sx={{ minWidth: 520 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Division</TableCell>
                                        <TableCell align="right">Events</TableCell>
                                        <TableCell align="right">Avg attendance</TableCell>
                                        <TableCell align="right">Going rate</TableCell>
                                        <TableCell align="right">Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {attendance.byDivision.map((division) => (
                                        <TableRow key={division.divisionId} hover>
                                            <TableCell sx={{ fontWeight: 600 }}>{division.divisionName}</TableCell>
                                            <TableCell align="right">{division.totalEvents}</TableCell>
                                            <TableCell align="right">{division.averageAttendance}</TableCell>
                                            <TableCell align="right">{division.goingRate}%</TableCell>
                                            <TableCell align="right">
                                                <RateChip goingRate={division.goingRate} totalEvents={division.totalEvents} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                )}

                {/* Monthly Activity Trends */}
                <Card>
                    <CardHeader title="Monthly activity" subheader="Last 6 months" />
                    <TableContainer sx={{ border: 0, borderRadius: 0 }}>
                        <Table aria-label="Monthly activity" sx={{ minWidth: 480 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Month</TableCell>
                                    <TableCell align="right">Teams created</TableCell>
                                    <TableCell align="right">Players added</TableCell>
                                    <TableCell align="right">Events scheduled</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {trends.monthlyActivity.map((month) => (
                                    <TableRow key={month.month} hover>
                                        <TableCell sx={{ fontWeight: 600 }}>{month.month}</TableCell>
                                        <TableCell align="right">{month.teamsCreated}</TableCell>
                                        <TableCell align="right">{month.playersAdded}</TableCell>
                                        <TableCell align="right">{month.eventsScheduled}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>

                {/* Participation Trend */}
                <Card>
                    <CardHeader title="Participation rate trend" subheader="Last 6 months" />
                    <TableContainer sx={{ border: 0, borderRadius: 0 }}>
                        <Table aria-label="Participation rate trend" sx={{ minWidth: 480 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Month</TableCell>
                                    <TableCell align="right">Participation rate</TableCell>
                                    <TableCell align="right">Total RSVPs</TableCell>
                                    <TableCell align="right">Trend</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {trends.participationTrend.map((month, index) => {
                                    const prevMonth = index > 0 ? trends.participationTrend[index - 1] : null;
                                    const trend = prevMonth
                                        ? month.participationRate > prevMonth.participationRate
                                            ? 'up'
                                            : month.participationRate < prevMonth.participationRate
                                                ? 'down'
                                                : 'stable'
                                        : 'stable';

                                    return (
                                        <TableRow key={month.month} hover>
                                            <TableCell sx={{ fontWeight: 600 }}>{month.month}</TableCell>
                                            <TableCell align="right">{month.participationRate}%</TableCell>
                                            <TableCell align="right">{month.totalRSVPs}</TableCell>
                                            <TableCell align="right">
                                                {trend === 'up' && (
                                                    <Chip
                                                        icon={<TrendingUpIcon />}
                                                        label="Up"
                                                        color="success"
                                                        size="small"
                                                    />
                                                )}
                                                {trend === 'down' && (
                                                    <Chip
                                                        icon={<TrendingDownIcon />}
                                                        label="Down"
                                                        color="error"
                                                        size="small"
                                                    />
                                                )}
                                                {trend === 'stable' && (
                                                    <Chip label="Stable" size="small" variant="outlined" />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            </Stack>
        </PageContainer>
    );
}
