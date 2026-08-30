"use client";

import { useState, useTransition } from "react";
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
import LockIcon from "@mui/icons-material/Lock";

import { useToast } from "@/components/ui/Toast";
import {
  createRaceSession,
  deleteRaceSession,
} from "@/lib/actions/race-sessions";
import {
  RACE_SESSION_KINDS,
  RACE_SESSION_KIND_LABELS,
} from "@/lib/utils/validation";
import type { RaceSessionKind, RaceSessionView } from "@/types/race-rounds";

type SessionTimetableProps = {
  roundId: string;
  sessions: RaceSessionView[];
  canManage: boolean;
  /** Venue-local timezone to read the stored instants in. */
  timezone: string;
};

/**
 * The weekend timetable.
 *
 * Times render in the round's timezone rather than the reader's: a marshal in
 * another state still needs to know that qualifying is at 09:00 *at the
 * circuit* (FR-012).
 */
function formatWindow(session: RaceSessionView, timezone: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone: session.timezone || timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endFormatter = new Intl.DateTimeFormat(undefined, {
    timeZone: session.timezone || timezone,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatter.format(new Date(session.startAt))} – ${endFormatter.format(
    new Date(session.endAt),
  )}`;
}

/** A local datetime string (yyyy-MM-ddTHH:mm) for the form inputs. */
function toInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export default function SessionTimetable({
  roundId,
  sessions,
  canManage,
  timezone,
}: SessionTimetableProps) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<RaceSessionKind>("RACE");
  const [startAt, setStartAt] = useState(() => toInputValue(new Date()));
  const [endAt, setEndAt] = useState("");

  // Sessions are appended to the end of the timetable; reordering is a matter
  // of editing the times, which is what an organizer actually changes.
  const nextOrder = sessions.reduce((max, s) => Math.max(max, s.sortOrder), -1) + 1;

  function handleAdd() {
    startTransition(async () => {
      const result = await createRaceSession({
        roundId,
        name,
        kind,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        timezone,
        sortOrder: nextOrder,
      });

      if (result.success) {
        showSuccess("Session added to the timetable.");
        setName("");
        setEndAt("");
        router.refresh();
      } else {
        showError(result.error);
      }
    });
  }

  function handleDelete(sessionId: string) {
    startTransition(async () => {
      const result = await deleteRaceSession(sessionId);
      if (result.success) {
        showSuccess("Session removed.");
        router.refresh();
      } else {
        showError(result.error);
      }
    });
  }

  return (
    <Stack spacing={3}>
      {sessions.length === 0 ? (
        <Typography color="text.secondary">
          No sessions have been timetabled for this weekend yet.
        </Typography>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Session</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Where</TableCell>
                {canManage && <TableCell />}
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" fontWeight={600}>
                        {session.name}
                      </Typography>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={RACE_SESSION_KIND_LABELS[session.kind]}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell>{formatWindow(session, timezone)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2">
                        {session.segment?.name ??
                          session.surface?.name ??
                          session.venue?.name ??
                          "—"}
                      </Typography>
                      {session.hasReservation && (
                        // The distinction that matters on race day: is this
                        // space actually booked, or just written down?
                        <Chip
                          size="small"
                          color="success"
                          variant="outlined"
                          icon={<LockIcon />}
                          label="Booked"
                        />
                      )}
                    </Stack>
                  </TableCell>
                  {canManage && (
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        aria-label={`Remove ${session.name}`}
                        disabled={pending}
                        onClick={() => handleDelete(session.id)}
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
            Add a session
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as RaceSessionKind)}
              fullWidth
            >
              {RACE_SESSION_KINDS.map((option) => (
                <MenuItem key={option} value={option}>
                  {RACE_SESSION_KIND_LABELS[option]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Starts"
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="Ends"
              type="datetime-local"
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ mt: 2, minHeight: 44 }}
            disabled={pending || !name.trim() || !startAt || !endAt}
            onClick={handleAdd}
          >
            Add session
          </Button>
        </Paper>
      )}
    </Stack>
  );
}
