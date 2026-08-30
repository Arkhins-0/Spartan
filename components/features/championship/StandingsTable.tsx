"use client";

import { useState } from "react";
import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { EmptyState } from "@/components/ui/EmptyState";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import type { ChampionshipStandings } from "@/types/race-rounds";

type StandingsTableProps = {
  teamStandings: ChampionshipStandings;
  driverStandings: ChampionshipStandings;
};

/** Points are stored as decimals; render halves but not trailing zeroes. */
function formatPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

export default function StandingsTable({
  teamStandings,
  driverStandings,
}: StandingsTableProps) {
  const [tab, setTab] = useState<"TEAM" | "DRIVER">("TEAM");

  const active = tab === "TEAM" ? teamStandings : driverStandings;

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, value: "TEAM" | "DRIVER") => setTab(value)}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab value="TEAM" label="Teams" sx={{ minHeight: 48 }} />
        <Tab value="DRIVER" label="Drivers" sx={{ minHeight: 48 }} />
      </Tabs>

      {active.rows.length === 0 ? (
        <EmptyState
          icon={<EmojiEventsIcon />}
          title="No standings yet"
          description={
            tab === "DRIVER"
              ? "Driver standings appear once results are recorded against individual drivers."
              : "Standings appear once results are recorded for a round."
          }
        />
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {tab === "TEAM" ? "Team" : "Driver"}
                </TableCell>
                {tab === "DRIVER" && <TableCell sx={{ fontWeight: 700 }}>Team</TableCell>}
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Points
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Rounds
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Wins
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Podiums
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {active.rows.map((row, index) => (
                <TableRow key={row.key} hover>
                  <TableCell>
                    {index === 0 ? (
                      <Chip size="small" color="primary" label="1" />
                    ) : (
                      index + 1
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {row.name}
                    </Typography>
                  </TableCell>
                  {tab === "DRIVER" && (
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {row.teamName}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {formatPoints(row.points)}
                  </TableCell>
                  <TableCell align="right">{row.rounds}</TableCell>
                  <TableCell align="right">{row.wins}</TableCell>
                  <TableCell align="right">{row.podiums}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
        Ties break on countback: most wins, then most podium finishes.
      </Typography>
    </Box>
  );
}
