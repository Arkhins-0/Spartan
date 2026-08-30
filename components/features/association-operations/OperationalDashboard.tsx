import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { LinkMuiLink } from "@/components/ui/NextLinkComposites";
import type { AssociationOperationsData, OperationsAction } from "@/lib/data/association-operations";

type OperationalDashboardProps = {
  data: AssociationOperationsData | null;
  error?: string;
};

const sections: Array<[string, keyof AssociationOperationsData, string]> = [
  ["Pending track time requests", "pendingTrackTimeRequests", "Review requests"],
  ["Unassigned reservations", "unassignedReservations", "Assign activities"],
  ["Stale drafts", "staleDrafts", "Open schedule"],
  ["Unresolved conflicts", "unresolvedConflicts", "Resolve conflicts"],
  ["Migration overrides", "migrationOverrides", "Reconcile reservations"],
  ["Unscheduled teams", "unscheduledTeams", "Review schedule"],
  ["Phase gaps", "phaseGaps", "Review phases"],
  ["Volunteer shortages", "volunteerShortages", "Staff the shifts"],
  ["Race weekends with no posts", "unstaffedRounds", "Create posts"],
  ["Upcoming assignments", "upcomingReservations", "View reservations"],
  ["Upcoming changes", "upcomingChanges", "View changes"],
];

function ActionList({ items }: { items: OperationsAction[] }) {
  if (!items.length) {
    return <Typography color="text.secondary" variant="body2">Nothing needs attention.</Typography>;
  }
  return (
    <Stack divider={<Divider flexItem />} spacing={0}>
      {items.slice(0, 5).map((item) => (
        <Box key={item.id} sx={{ py: 0.5 }}>
          <LinkMuiLink
            href={item.href}
            underline="hover"
            color="text.primary"
            sx={{ display: "inline-flex", alignItems: "center", minHeight: 44, fontWeight: 600, fontSize: "0.8125rem" }}
          >
            {item.title}
          </LinkMuiLink>
          {item.detail && <Typography color="text.secondary" variant="caption" display="block">{item.detail}</Typography>}
        </Box>
      ))}
    </Stack>
  );
}

/** Flat stat tile: a small label over a large tabular figure. */
function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader title={label} />
      <CardContent>
        <Typography variant="scoreboard" component="p">{value}</Typography>
      </CardContent>
    </Card>
  );
}

function countLabel(count: number, noun = "item") {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function OperationalDashboard({ data, error }: OperationalDashboardProps) {
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Alert severity="info">Operations data is not available.</Alert>;

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 2 }}>
        <StatTile
          label="Needs attention"
          value={data.counts.pendingTrackTimeRequests + data.counts.unassignedReservations + data.counts.unresolvedConflicts}
        />
        <StatTile label="Schedule gaps" value={data.counts.unscheduledTeams + data.counts.phaseGaps} />
        <StatTile label="Gear" value={data.counts.urgentGearNeeds + data.counts.overdueGearCustody} />
        <StatTile label="Notifications" value={data.counts.outboxPending + data.counts.outboxFailed} />
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
        {sections.map(([title, key, action]) => {
          const items = data[key] as OperationsAction[];
          return (
            <Card key={title}>
              <CardHeader
                title={title}
                subheader={items.length ? countLabel(items.length) : "Clear"}
              />
              <CardContent>
                <ActionList items={items} />
                {items.length > 5 && (
                  <Typography color="text.secondary" variant="caption" display="block" sx={{ mt: 1 }}>
                    {action} to see all {items.length} items.
                  </Typography>
                )}
              </CardContent>
            </Card>
          );
        })}
        <Card>
          <CardHeader
            title="Volunteer shortages"
            subheader={
              data.volunteerShortages.length === 0
                ? "Fully staffed"
                : `${countLabel(data.volunteerShortages.length, "need")} still short of volunteers`
            }
          />
          <CardContent>
            {data.volunteerShortages.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                Every open volunteer need is fully staffed.
              </Typography>
            ) : (
              <ActionList items={data.volunteerShortages} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Gear and notification health" />
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="body2">Urgent needs: {data.gear.urgentNeeds.length}</Typography>
              <Typography variant="body2">Overdue custody: {data.gear.overdueCustody.length}</Typography>
              <Typography variant="body2">Notification backlog: {data.gear.outbox.pending + data.gear.outbox.processing}</Typography>
              {data.gear.outbox.failed > 0 && <Alert severity="warning">Some notifications need retry attention.</Alert>}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}

export default OperationalDashboard;
