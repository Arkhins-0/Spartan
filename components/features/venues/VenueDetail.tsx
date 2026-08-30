"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Link as MuiLink,
} from "@mui/material";
import {
  Place as PlaceIcon,
  Phone as PhoneIcon,
  Language as WebIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
} from "@mui/icons-material";
import { PageHeader } from "@/components/ui/PageHeader";
import { deleteVenue } from "@/lib/actions/venues";

const surfaceTypeLabels: Record<string, string> = {
  ICE: "Ice Rink",
  TURF: "Turf Field",
  COURT: "Court",
  FIELD: "Field",
  OTHER: "Other",
};

const amenityLabels: Record<string, string> = {
  locker_rooms: "Locker Rooms",
  parking: "Parking",
  pro_shop: "Pro Shop",
  scoreboard: "Scoreboard",
  concessions: "Concessions",
  restrooms: "Restrooms",
  heated_seating: "Heated Seating",
  lighting: "Lighting",
  sound_system: "Sound System",
  first_aid: "First Aid",
};

interface VenueDetailProps {
  venue: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    surfaceType: string;
    capacity: number | null;
    amenities: string[];
    phone: string | null;
    website: string | null;
    notes: string | null;
    visibility: string;
    isActive: boolean;
    team: { id: string; name: string } | null;
    league: { id: string; name: string } | null;
    createdBy: { id: string; name: string | null } | null;
    _count: { events: number };
  };
  canEdit: boolean;
  upcomingEvents?: Array<{
    id: string;
    title: string;
    startAt: string;
    type: string;
    team: { name: string };
  }>;
}

export default function VenueDetail({ venue, canEdit, upcomingEvents = [] }: VenueDetailProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteVenue(venue.id);
      if (result.success) {
        router.push("/venues");
      } else {
        setError(result.error);
        setDeleteDialogOpen(false);
      }
    } catch {
      setError("Failed to delete venue.");
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const locationParts = [venue.address, venue.city, venue.state, venue.zipCode]
    .filter(Boolean)
    .join(", ");

  const subtitle = [
    surfaceTypeLabels[venue.surfaceType] || venue.surfaceType,
    venue.visibility.charAt(0) + venue.visibility.slice(1).toLowerCase(),
    locationParts || null,
  ]
    .filter(Boolean)
    .join(" · ");

  const detailRows: Array<{ key: string; icon: React.ReactNode; content: React.ReactNode }> = [];
  if (locationParts) {
    detailRows.push({
      key: "location",
      icon: <PlaceIcon fontSize="small" />,
      content: <Typography variant="body2">{locationParts}</Typography>,
    });
  }
  if (venue.phone) {
    detailRows.push({
      key: "phone",
      icon: <PhoneIcon fontSize="small" />,
      content: <Typography variant="body2">{venue.phone}</Typography>,
    });
  }
  if (venue.website) {
    detailRows.push({
      key: "website",
      icon: <WebIcon fontSize="small" />,
      content: (
        <MuiLink
          variant="body2"
          href={venue.website.startsWith("http") ? venue.website : `https://${venue.website}`}
          target="_blank"
          rel="noopener noreferrer"
          color="text.primary"
        >
          {venue.website}
        </MuiLink>
      ),
    });
  }
  if (venue.capacity) {
    detailRows.push({
      key: "capacity",
      icon: <PeopleIcon fontSize="small" />,
      content: <Typography variant="body2">Capacity: {venue.capacity}</Typography>,
    });
  }

  return (
    <Box>
      <PageHeader
        icon={<PlaceIcon />}
        title={venue.name}
        subtitle={subtitle}
        actions={
          canEdit ? (
            <>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete
              </Button>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => router.push(`/venues/${venue.id}/edit`)}
              >
                Edit
              </Button>
            </>
          ) : undefined
        }
      />

      <Stack spacing={2}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!venue.isActive && (
          <Alert severity="warning">This venue is inactive and hidden from scheduling.</Alert>
        )}

        <Card>
          <CardHeader
            title="Details"
            action={
              <Stack direction="row" spacing={1}>
                <Chip label={surfaceTypeLabels[venue.surfaceType] || venue.surfaceType} size="small" />
                <Chip label={venue.visibility} size="small" variant="outlined" />
                {!venue.isActive && <Chip label="Inactive" size="small" color="error" />}
              </Stack>
            }
          />
          <CardContent>
            <Stack spacing={1.5}>
              {detailRows.map((row) => (
                <Stack key={row.key} direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ display: "flex", color: "text.secondary" }}>{row.icon}</Box>
                  {row.content}
                </Stack>
              ))}

              {venue.amenities.length > 0 && (
                <Box sx={{ pt: 0.5 }}>
                  <Typography variant="eyebrow" component="h3" sx={{ display: "block", mb: 1 }}>
                    Amenities
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                    {venue.amenities.map((amenity) => (
                      <Chip
                        key={amenity}
                        label={amenityLabels[amenity] || amenity}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {venue.notes && (
                <Box sx={{ pt: 0.5 }}>
                  <Typography variant="eyebrow" component="h3" sx={{ display: "block", mb: 0.5 }}>
                    Notes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {venue.notes}
                  </Typography>
                </Box>
              )}

              {(venue.team || venue.league) && (
                <Box sx={{ pt: 0.5 }}>
                  {venue.team && (
                    <Typography variant="body2" color="text.secondary">
                      Team: {venue.team.name}
                    </Typography>
                  )}
                  {venue.league && (
                    <Typography variant="body2" color="text.secondary">
                      League: {venue.league.name}
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>

        {upcomingEvents.length > 0 && (
          <Card>
            <CardHeader
              title="Upcoming events"
              subheader={`${venue._count.events} scheduled at this venue`}
            />
            <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
              <Stack spacing={0.5}>
                {upcomingEvents.map((event) => (
                  <Box
                    key={event.id}
                    component="button"
                    type="button"
                    onClick={() => router.push(`/events/${event.id}`)}
                    sx={{
                      all: "unset",
                      boxSizing: "border-box",
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 2,
                      px: 1.5,
                      py: 1,
                      minHeight: 44,
                      borderRadius: 1.5,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {event.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {event.team.name}
                      </Typography>
                    </Box>
                    <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
                      <Typography variant="body2">
                        {new Date(event.startAt).toLocaleDateString()}
                      </Typography>
                      <Chip label={event.type} size="small" variant="outlined" />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete venue</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {venue._count.events > 0
              ? `This venue has ${venue._count.events} associated events. It will be deactivated instead of deleted to preserve event history.`
              : "Are you sure you want to delete this venue? This action cannot be undone."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting} variant="text">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
