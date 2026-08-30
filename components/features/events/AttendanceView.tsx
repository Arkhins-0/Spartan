"use client";

import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Stack,
  Chip,
  Divider,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HelpIcon from "@mui/icons-material/Help";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import type {
  AttendanceCounts,
  AttendanceEntry,
  RSVPStatus,
} from "@/types/events";

interface AttendanceViewProps {
  /**
   * Per-identity attendance rows (contract of getEventAttendance): player-level
   * responses where they exist, user-level otherwise. A user row and their
   * child rows are distinct entries.
   */
  entries: AttendanceEntry[];
  /** Status counts, deduplicated per entry (not per user). */
  counts: AttendanceCounts;
}

/** Status is the one place colour is allowed: the icon carries it, nothing else. */
const STATUS_SECTIONS: Array<{
  status: RSVPStatus;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    status: "GOING",
    label: "Going",
    icon: <CheckCircleIcon color="success" fontSize="small" />,
  },
  {
    status: "MAYBE",
    label: "Maybe",
    icon: <HelpIcon color="warning" fontSize="small" />,
  },
  {
    status: "NOT_GOING",
    label: "Not going",
    icon: <CancelIcon color="error" fontSize="small" />,
  },
  {
    status: "NO_RESPONSE",
    label: "No response",
    icon: <QuestionMarkIcon color="disabled" fontSize="small" />,
  },
];

function AttendanceEntryRow({ entry }: { entry: AttendanceEntry }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
      sx={{ minHeight: 32 }}
    >
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {entry.name}
      </Typography>
      <Chip
        label={entry.kind === "player" ? "Player" : "Member"}
        size="small"
        variant="outlined"
      />
      {entry.kind === "player" && entry.respondedByName && (
        <Typography variant="caption" color="text.secondary">
          answered by {entry.respondedByName}
        </Typography>
      )}
    </Stack>
  );
}

export function AttendanceView({ entries, counts }: AttendanceViewProps) {
  // Group entries by status for the detailed lists
  const grouped: Record<RSVPStatus, AttendanceEntry[]> = {
    GOING: [],
    NOT_GOING: [],
    MAYBE: [],
    NO_RESPONSE: [],
  };
  for (const entry of entries) {
    grouped[entry.status].push(entry);
  }

  return (
    <Card component="section">
      <CardHeader
        title="Attendance"
        subheader={`${entries.length} ${entries.length === 1 ? "response" : "responses"} tracked`}
        slotProps={{ title: { component: "h2" } }}
      />
      <CardContent>
        {/* Summary counts: plain figures, status carried by the icon. */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
            gap: 2,
          }}
        >
          {STATUS_SECTIONS.map(({ status, label, icon }) => (
            <Box key={status}>
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                {icon}
                <Typography variant="dataLabel" component="span" color="text.secondary">
                  {label}
                </Typography>
              </Stack>
              <Typography variant="scoreboard" component="p">
                {counts[status]}
              </Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Detailed lists */}
        <Stack spacing={2.5}>
          {STATUS_SECTIONS.map(({ status, label, icon }) =>
            grouped[status].length > 0 ? (
              <Box key={status}>
                <Typography
                  variant="subtitle2"
                  component="h3"
                  sx={{
                    mb: 0.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  {icon}
                  {label} ({grouped[status].length})
                </Typography>
                <Stack spacing={0.5}>
                  {grouped[status].map((entry, index) => (
                    <AttendanceEntryRow
                      key={`${status}:${entry.kind}:${entry.name}:${index}`}
                      entry={entry}
                    />
                  ))}
                </Stack>
              </Box>
            ) : null
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
