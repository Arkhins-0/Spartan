"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

import { useToast } from "@/components/ui/Toast";
import { upsertRaceEntry, deleteRaceEntry } from "@/lib/actions/race-entries";
import { RACE_ENTRY_STATUSES } from "@/lib/utils/validation";
import type { RaceEntryStatus, RaceEntryView } from "@/types/race-rounds";

type TeamOption = { id: string; name: string };
type DriverOption = { id: string; name: string; teamId: string };

type EntryListEditorProps = {
  roundId: string;
  entries: RaceEntryView[];
  teams: TeamOption[];
  drivers: DriverOption[];
  canManage: boolean;
};

const STATUS_LABELS: Record<RaceEntryStatus, string> = {
  PROVISIONAL: "Provisional",
  CONFIRMED: "Confirmed",
  WITHDRAWN: "Withdrawn",
};

const STATUS_COLORS: Record<RaceEntryStatus, "default" | "success" | "warning"> = {
  PROVISIONAL: "warning",
  CONFIRMED: "success",
  WITHDRAWN: "default",
};

export default function EntryListEditor({
  roundId,
  entries,
  teams,
  drivers,
  canManage,
}: EntryListEditorProps) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [pending, startTransition] = useTransition();

  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [className, setClassName] = useState("");
  const [status, setStatus] = useState<RaceEntryStatus>("PROVISIONAL");

  // A driver can only be entered for their own team; offering the whole
  // association would build a submission the server refuses.
  const teamDrivers = useMemo(
    () => drivers.filter((driver) => driver.teamId === teamId),
    [drivers, teamId],
  );

  function handleAdd() {
    startTransition(async () => {
      const result = await upsertRaceEntry({
        roundId,
        teamId,
        playerId: playerId || undefined,
        carNumber: carNumber || undefined,
        className: className || undefined,
        status,
      });

      if (result.success) {
        showSuccess("Entry saved.");
        setPlayerId("");
        setCarNumber("");
        router.refresh();
      } else {
        showError(result.error);
      }
    });
  }

  function handleDelete(entryId: string) {
    startTransition(async () => {
      const result = await deleteRaceEntry(entryId);
      if (result.success) {
        showSuccess("Entry removed.");
        router.refresh();
      } else {
        showError(result.error);
      }
    });
  }

  return (
    <Stack spacing={3}>
      {entries.length === 0 ? (
        <Typography color="text.secondary">
          No cars have been entered for this round yet.
        </Typography>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>No.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Driver</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Team</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                {canManage && <TableCell />}
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell>{entry.carNumber ?? "—"}</TableCell>
                  <TableCell>{entry.driver?.name ?? "Team entry"}</TableCell>
                  <TableCell>{entry.team.name}</TableCell>
                  <TableCell>{entry.className ?? "—"}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      color={STATUS_COLORS[entry.status]}
                      label={STATUS_LABELS[entry.status]}
                    />
                  </TableCell>
                  {canManage && (
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        aria-label={`Remove entry ${entry.carNumber ?? entry.team.name}`}
                        disabled={pending}
                        onClick={() => handleDelete(entry.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {canManage && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" component="h3" gutterBottom>
            Enter a car
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              select
              label="Team"
              value={teamId}
              onChange={(event) => {
                setTeamId(event.target.value);
                setPlayerId("");
              }}
              fullWidth
            >
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Driver"
              value={playerId}
              onChange={(event) => setPlayerId(event.target.value)}
              disabled={!teamId}
              helperText="Leave blank for a team entry."
              fullWidth
            >
              <MenuItem value="">Team entry</MenuItem>
              {teamDrivers.map((driver) => (
                <MenuItem key={driver.id} value={driver.id}>
                  {driver.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Car number"
              value={carNumber}
              onChange={(event) => setCarNumber(event.target.value)}
              // Text, not number: "07" and "1A" are both real racing numbers.
              helperText="Leading zeros are kept."
              fullWidth
            />
            <TextField
              label="Class"
              value={className}
              onChange={(event) => setClassName(event.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as RaceEntryStatus)}
              fullWidth
            >
              {RACE_ENTRY_STATUSES.map((option) => (
                <MenuItem key={option} value={option}>
                  {STATUS_LABELS[option]}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ mt: 2, minHeight: 44 }}
            disabled={pending || !teamId}
            onClick={handleAdd}
          >
            Save entry
          </Button>
        </Paper>
      )}
    </Stack>
  );
}
