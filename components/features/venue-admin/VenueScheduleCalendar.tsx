import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

interface VenueScheduleBlockSummary {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  activityType: string;
  status: string;
}

interface VenueScheduleCalendarProps {
  blocks?: VenueScheduleBlockSummary[];
}

/**
 * Schedule as a dense table: sticky head, 13px cells, hairline rows. It does
 * not collapse into cards on a phone — the container scrolls sideways.
 */
export function VenueScheduleCalendar({ blocks = [] }: VenueScheduleCalendarProps) {
  return (
    <Card aria-labelledby="venue-schedule-heading">
      <CardHeader
        title="Venue schedule"
        subheader={blocks.length === 0 ? undefined : `${blocks.length} block${blocks.length === 1 ? "" : "s"}`}
        slotProps={{ title: { id: "venue-schedule-heading", component: "h2" } }}
      />
      {blocks.length > 0 ? (
        <TableContainer sx={{ border: 0, borderRadius: 0, overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>Block</TableCell>
                <TableCell>Activity</TableCell>
                <TableCell>Starts</TableCell>
                <TableCell>Ends</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {blocks.map((block) => (
                <TableRow key={block.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{block.title}</TableCell>
                  <TableCell>{block.activityType}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{block.startsAt.toLocaleString()}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{block.endsAt.toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={block.status === "PUBLISHED" ? "success" : "default"}
                      label={block.status}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            No schedule blocks are published yet.
          </Typography>
        </CardContent>
      )}
    </Card>
  );
}
