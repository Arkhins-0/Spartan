"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FlagIcon from "@mui/icons-material/Flag";
import NextLink from "next/link";
import { createRaceRound } from "@/lib/actions/race-rounds";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import type { RaceRoundView } from "@/types/race-rounds";

type RaceRoundsViewProps = {
  leagueId: string;
  rounds: RaceRoundView[];
  venues: Array<{ id: string; name: string }>;
  canManage: boolean;
};

const STATUS_COLORS = {
  SCHEDULED: "default",
  RESULTS_PENDING: "warning",
  FINALIZED: "success",
} as const;

const STATUS_LABELS = {
  SCHEDULED: "Scheduled",
  RESULTS_PENDING: "Results pending",
  FINALIZED: "Finalized",
} as const;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: "UTC",
  dateStyle: "medium",
});

export default function RaceRoundsView({
  leagueId,
  rounds,
  venues,
  canManage,
}: RaceRoundsViewProps) {
  const { showSuccess, showError } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [roundNumber, setRoundNumber] = useState(String(rounds.length + 1));
  const [raceDate, setRaceDate] = useState("");
  const [venueId, setVenueId] = useState("");
  const [locationText, setLocationText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setOpen(false);
    setName("");
    setRoundNumber(String(rounds.length + 1));
    setRaceDate("");
    setVenueId("");
    setLocationText("");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await createRaceRound({
        leagueId,
        name,
        roundNumber: Number(roundNumber),
        raceDate,
        venueId: venueId || undefined,
        locationText: locationText || undefined,
      });

      if (result.success) {
        showSuccess("Round added");
        handleClose();
      } else {
        showError(result.error);
      }
    } catch {
      showError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {canManage && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            sx={{ minHeight: 44 }}
          >
            Add round
          </Button>
        </Box>
      )}

      {rounds.length === 0 ? (
        <EmptyState
          icon={<FlagIcon />}
          title="No rounds yet"
          description={
            canManage
              ? "Add the first round of the championship calendar."
              : "The championship calendar will appear here once rounds are added."
          }
        />
      ) : (
        <Stack spacing={2}>
          {rounds.map((round) => (
            <Card key={round.id}>
              <CardActionArea
                component={NextLink}
                href={`/league/${leagueId}/rounds/${round.id}`}
              >
                <CardContent>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Chip size="small" color="primary" label={`Round ${round.roundNumber}`} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {round.name}
                    </Typography>
                    <Chip
                      size="small"
                      color={STATUS_COLORS[round.status]}
                      label={STATUS_LABELS[round.status]}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {dateFormatter.format(new Date(`${round.raceDate}T00:00:00.000Z`))}
                    {round.venue ? ` · ${round.venue.name}` : ""}
                    {!round.venue && round.locationText ? ` · ${round.locationText}` : ""}
                    {round.resultCount > 0 ? ` · ${round.resultCount} entrants` : ""}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add round</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Round name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              autoFocus
              placeholder="Kari Motor Speedway"
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <TextField
              label="Round number"
              value={roundNumber}
              onChange={(e) => setRoundNumber(e.target.value)}
              type="number"
              required
              fullWidth
              slotProps={{ htmlInput: { min: 1, max: 99 } }}
            />
            <TextField
              label="Race date"
              value={raceDate}
              onChange={(e) => setRaceDate(e.target.value)}
              type="date"
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            {venues.length > 0 && (
              <Select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                displayEmpty
                fullWidth
              >
                <MenuItem value="">
                  <em>No saved circuit</em>
                </MenuItem>
                {venues.map((venue) => (
                  <MenuItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </MenuItem>
                ))}
              </Select>
            )}
            {!venueId && (
              <TextField
                label="Location"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                fullWidth
                placeholder="Coimbatore, Tamil Nadu"
                slotProps={{ htmlInput: { maxLength: 200 } }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || !raceDate || !roundNumber}
          >
            {isSubmitting ? "Saving..." : "Add round"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
