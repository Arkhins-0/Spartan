"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
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
import { recordRaceResults } from "@/lib/actions/race-rounds";
import { useToast } from "@/components/ui/Toast";
import type { RaceResultStatus, RaceRoundDetail } from "@/types/race-rounds";

type TeamOption = { id: string; name: string };
type DriverOption = { id: string; name: string; teamId: string; carNumber: number | null };

type ResultRow = {
  key: string;
  teamId: string;
  playerId: string;
  position: string;
  points: string;
  status: RaceResultStatus;
};

type RaceResultsEntryProps = {
  round: RaceRoundDetail;
  teams: TeamOption[];
  drivers: DriverOption[];
};

let rowCounter = 0;
const nextKey = () => `row-${(rowCounter += 1)}`;

function rowsFromRound(round: RaceRoundDetail): ResultRow[] {
  if (round.results.length === 0) {
    return [
      { key: nextKey(), teamId: "", playerId: "", position: "", points: "", status: "CLASSIFIED" },
    ];
  }
  return round.results.map((result) => ({
    key: nextKey(),
    teamId: result.team.id,
    playerId: result.driver?.id ?? "",
    position: result.position != null ? String(result.position) : "",
    points: String(result.points),
    status: result.status,
  }));
}

/**
 * The results grid for one round: one line per entrant, position and points
 * only. Saving replaces the whole sheet, so corrections are just re-saves.
 */
export default function RaceResultsEntry({ round, teams, drivers }: RaceResultsEntryProps) {
  const { showSuccess, showError } = useToast();
  const [rows, setRows] = useState<ResultRow[]>(() => rowsFromRound(round));
  const [finalize, setFinalize] = useState(round.status !== "RESULTS_PENDING");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (key: string, patch: Partial<ResultRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { key: nextKey(), teamId: "", playerId: "", position: "", points: "", status: "CLASSIFIED" },
    ]);

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((row) => row.key !== key));

  const handleSave = async () => {
    const filled = rows.filter((row) => row.teamId);
    if (filled.length === 0) {
      showError("Add at least one entrant before saving");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await recordRaceResults({
        roundId: round.id,
        finalize,
        results: filled.map((row) => ({
          teamId: row.teamId,
          playerId: row.playerId || undefined,
          // Only a classified finish carries a position.
          position:
            row.status === "CLASSIFIED" && row.position ? Number(row.position) : null,
          points: row.points ? Number(row.points) : 0,
          status: row.status,
        })),
      });

      if (result.success) {
        showSuccess(`Saved ${result.data.resultCount} results`);
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
    <Box>
      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Team</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Driver</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 100 }}>Pos</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 110 }}>Points</TableCell>
              <TableCell sx={{ width: 56 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const teamDrivers = drivers.filter((driver) => driver.teamId === row.teamId);
              return (
                <TableRow key={row.key}>
                  <TableCell>
                    <Select
                      value={row.teamId}
                      onChange={(e) =>
                        // Changing team invalidates the driver choice.
                        update(row.key, { teamId: e.target.value, playerId: "" })
                      }
                      size="small"
                      fullWidth
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>Select team</em>
                      </MenuItem>
                      {teams.map((team) => (
                        <MenuItem key={team.id} value={team.id}>
                          {team.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.playerId}
                      onChange={(e) => update(row.key, { playerId: e.target.value })}
                      size="small"
                      fullWidth
                      displayEmpty
                      disabled={!row.teamId}
                    >
                      <MenuItem value="">
                        <em>Team entry</em>
                      </MenuItem>
                      {teamDrivers.map((driver) => (
                        <MenuItem key={driver.id} value={driver.id}>
                          {driver.carNumber != null ? `#${driver.carNumber} ` : ""}
                          {driver.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.status}
                      onChange={(e) =>
                        update(row.key, {
                          status: e.target.value as RaceResultStatus,
                          // A car that did not finish has no position.
                          position: e.target.value === "CLASSIFIED" ? row.position : "",
                        })
                      }
                      size="small"
                      fullWidth
                    >
                      <MenuItem value="CLASSIFIED">Classified</MenuItem>
                      <MenuItem value="DNF">DNF</MenuItem>
                      <MenuItem value="DNS">DNS</MenuItem>
                      <MenuItem value="DSQ">DSQ</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={row.position}
                      onChange={(e) => update(row.key, { position: e.target.value })}
                      size="small"
                      type="number"
                      disabled={row.status !== "CLASSIFIED"}
                      slotProps={{ htmlInput: { min: 1, max: 999 } }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={row.points}
                      onChange={(e) => update(row.key, { points: e.target.value })}
                      size="small"
                      type="number"
                      slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => removeRow(row.key)}
                      aria-label="Remove entrant"
                      size="small"
                      disabled={rows.length === 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mt: 2 }}
        alignItems={{ sm: "center" }}
      >
        <Button startIcon={<AddIcon />} onClick={addRow} sx={{ minHeight: 44 }}>
          Add entrant
        </Button>
        <FormControlLabel
          control={
            <Checkbox checked={finalize} onChange={(e) => setFinalize(e.target.checked)} />
          }
          label="Mark round finalized"
        />
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSubmitting}
          sx={{ minHeight: 44 }}
        >
          {isSubmitting ? "Saving..." : "Save results"}
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
        Saving replaces this round&apos;s results. Standings recalculate automatically.
      </Typography>
    </Box>
  );
}
