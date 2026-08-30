"use client";

import { Card, CardContent, Typography, Box, Chip, Stack } from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  Place as PlaceIcon,
  Groups as GroupsIcon,
  SportsScore as OpponentIcon,
} from "@mui/icons-material";
import Link from "next/link";
import type { Event } from "@/types/events";

// EventCard can accept either simple Event or extended with league/team info
interface EventCardProps extends Event {
  leagueId?: string;
  homeTeam?: {
    id: string;
    name: string;
  } | null;
  awayTeam?: {
    id: string;
    name: string;
  } | null;
  teamName?: string;
}

function MetaLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ color: "text.secondary" }}>
      <Box aria-hidden sx={{ display: "flex", "& .MuiSvgIcon-root": { fontSize: 14 } }}>
        {icon}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </Stack>
  );
}

export default function EventCard({
  id,
  type,
  title,
  startAt,
  location,
  opponent,
  homeTeam,
  awayTeam,
  teamName,
}: EventCardProps) {
  // Convert UTC date to local timezone
  const localDate = new Date(startAt);
  const dateStr = localDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = localDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const typeLabel = type === "GAME" ? "Game" : type === "PRACTICE" ? "Practice" : type;

  return (
    // Always use the team event detail route; repoint league events to
    // /league/[leagueId]/events/[id] when that route ships (roadmap D1)
    <Card
      component={Link}
      href={`/events/${id}`}
      sx={{
        display: "block",
        color: "inherit",
        textDecoration: "none",
        cursor: "pointer",
        minHeight: 44,
        // Flat: hover is the muted surface and a heavier hairline, no lift.
        "&:hover": {
          bgcolor: "action.hover",
          borderColor: "var(--sp-border-input)",
        },
      }}
    >
      <CardContent>
        <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" component="h2">
              {homeTeam && awayTeam ? `${homeTeam.name} vs ${awayTeam.name}` : title}
            </Typography>
          </Box>
          <Chip label={typeLabel} size="small" sx={{ flexShrink: 0 }} />
        </Stack>

        <Stack spacing={0.5}>
          <MetaLine icon={<CalendarIcon />}>
            {dateStr} at {timeStr}
          </MetaLine>

          <MetaLine icon={<PlaceIcon />}>{location}</MetaLine>

          {homeTeam && awayTeam ? (
            <MetaLine icon={<GroupsIcon />}>
              {homeTeam.name} (Home) vs {awayTeam.name} (Away)
            </MetaLine>
          ) : teamName ? (
            <MetaLine icon={<GroupsIcon />}>{teamName}</MetaLine>
          ) : null}

          {opponent && !homeTeam && (
            <MetaLine icon={<OpponentIcon />}>vs {opponent}</MetaLine>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
