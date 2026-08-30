"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Stack,
} from "@mui/material";
import {
  Place as PlaceIcon,
  People as PeopleIcon,
} from "@mui/icons-material";

interface VenueCardProps {
  venue: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    surfaceType: string;
    capacity: number | null;
    visibility: string;
    isActive: boolean;
    team: { id: string; name: string } | null;
    league: { id: string; name: string } | null;
  };
}

const surfaceTypeLabels: Record<string, string> = {
  ICE: "Ice",
  TURF: "Turf",
  COURT: "Court",
  FIELD: "Field",
  OTHER: "Other",
};

const visibilityLabels: Record<string, string> = {
  PUBLIC: "Public",
  LEAGUE: "League",
  TEAM: "Team",
};

export default function VenueCard({ venue }: VenueCardProps) {
  const router = useRouter();

  const locationParts = [venue.city, venue.state].filter(Boolean).join(", ");

  return (
    <Card
      onClick={() => router.push(`/venues/${venue.id}`)}
      sx={{
        cursor: "pointer",
        opacity: venue.isActive ? 1 : 0.6,
        // Hover is a step of grey and a firmer hairline — never a lift.
        "&:hover": {
          bgcolor: "action.hover",
          borderColor: "var(--sp-border-input)",
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1, gap: 1 }}>
          <Typography variant="subtitle1" component="h3" noWrap sx={{ flex: 1, minWidth: 0 }}>
            {venue.name}
          </Typography>
          <Chip
            label={surfaceTypeLabels[venue.surfaceType] || venue.surfaceType}
            size="small"
          />
        </Box>

        {venue.address && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
            <PlaceIcon fontSize="small" sx={{ color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary" noWrap>
              {venue.address}
            </Typography>
          </Box>
        )}

        {locationParts && (
          <Typography variant="body2" color="text.secondary" sx={{ ml: 3.5, mb: 0.5 }}>
            {locationParts}
          </Typography>
        )}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
          {venue.capacity && (
            <Chip
              icon={<PeopleIcon />}
              label={`${venue.capacity}`}
              size="small"
              variant="outlined"
            />
          )}
          <Chip
            label={visibilityLabels[venue.visibility] || venue.visibility}
            size="small"
            variant="outlined"
          />
          {venue.team && (
            <Chip label={venue.team.name} size="small" variant="outlined" />
          )}
          {venue.league && (
            <Chip label={venue.league.name} size="small" variant="outlined" />
          )}
          {!venue.isActive && (
            <Chip label="Inactive" size="small" color="error" variant="outlined" />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
