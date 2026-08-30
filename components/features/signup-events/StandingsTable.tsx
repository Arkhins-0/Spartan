import {
  Card,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import type { StandingsRow } from "@/lib/utils/event-standings";

interface StandingsTableProps {
  standings: StandingsRow[];
}

/** Tournament standings — only rendered for age-eligible tournament events. */
export function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <Card component="section" aria-labelledby="standings-heading">
      <CardHeader
        title="Standings"
        subheader={`${standings.length} team${standings.length === 1 ? "" : "s"}`}
        slotProps={{ title: { id: "standings-heading", component: "h2" } }}
      />
      <TableContainer sx={{ border: 0, borderRadius: 0, overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 520 }}>
          <TableHead>
            <TableRow>
              <TableCell>Team</TableCell>
              <TableCell align="right">GP</TableCell>
              <TableCell align="right">W</TableCell>
              <TableCell align="right">L</TableCell>
              <TableCell align="right">T</TableCell>
              <TableCell align="right">GF</TableCell>
              <TableCell align="right">GA</TableCell>
              <TableCell align="right">PTS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {standings.map((row) => (
              <TableRow key={row.teamId} hover>
                <TableCell sx={{ fontWeight: 600 }}>{row.teamName}</TableCell>
                <TableCell align="right">{row.gamesPlayed}</TableCell>
                <TableCell align="right">{row.wins}</TableCell>
                <TableCell align="right">{row.losses}</TableCell>
                <TableCell align="right">{row.ties}</TableCell>
                <TableCell align="right">{row.goalsFor}</TableCell>
                <TableCell align="right">{row.goalsAgainst}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{row.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
