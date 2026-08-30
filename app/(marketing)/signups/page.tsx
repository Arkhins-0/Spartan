import type { Metadata } from "next";
import {
  Card,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkMuiLink } from "@/components/ui/NextLinkComposites";
import { listPublicSignupEvents } from "@/lib/actions/signup-events";
import { AGE_CLASSIFICATION_LABELS } from "@/lib/utils/age-level";
import { formatDateTime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events | Spartan",
  description: "Upcoming signup events from local rinks, associations, and teams.",
};

export default async function PublicEventsPage() {
  const events = await listPublicSignupEvents();

  return (
    <PageContainer>
      <PageHeader
        icon={<EventAvailableIcon />}
        title="Upcoming events"
        subtitle={
          events.length === 0
            ? "Clinics, scrimmage nights, tryouts and tournaments from local rinks, associations and teams"
            : `${events.length} public event${events.length === 1 ? "" : "s"} · clinics, scrimmage nights, tryouts and tournaments`
        }
      />

      {events.length === 0 ? (
        <EmptyState
          icon={<EventAvailableIcon />}
          title="No public events right now"
          description="Check back soon — new signup events appear here as soon as they are published."
        />
      ) : (
        <Card>
          <TableContainer sx={{ border: 0, borderRadius: 0, overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Event</TableCell>
                  <TableCell>When</TableCell>
                  <TableCell>Where</TableCell>
                  <TableCell>Ages</TableCell>
                  <TableCell>Slots</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((event) => {
                  const hostName =
                    event.hostOrganization?.name ?? event.hostLeague?.name ?? event.hostTeam?.name ?? "";
                  return (
                    <TableRow key={event.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <LinkMuiLink href={`/signups/${event.id}`} color="inherit" sx={{ fontWeight: 600 }}>
                            {event.title}
                          </LinkMuiLink>
                          {event.status === "CANCELED" ? (
                            <Chip size="small" color="error" label="Canceled" />
                          ) : null}
                        </Stack>
                        {hostName ? (
                          <Typography variant="caption" color="text.secondary" component="div">
                            {hostName}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {formatDateTime(event.startAt, event.timezone)}
                      </TableCell>
                      <TableCell>{event.venue?.name ?? event.locationText ?? "Location TBD"}</TableCell>
                      <TableCell>
                        <Chip size="small" label={AGE_CLASSIFICATION_LABELS[event.ageClassification]} />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {event.slots.slice(0, 4).map((slot) => (
                            <Chip key={slot.id} size="small" variant="outlined" label={slot.name} />
                          ))}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </PageContainer>
  );
}
