import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  List,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  SportsHockey as SportsHockeyIcon,
  Event as EventIcon,
  ArrowForward as ArrowForwardIcon,
  Place as PlaceIcon,
} from "@mui/icons-material";
import { LinkButton, LinkListItemButton } from "@/components/ui/NextLinkComposites";
import { getUpcomingSchedule, type UpcomingEventItem } from "@/lib/data/dashboard";
import { formatDateTimeInZone } from "@/lib/utils/date";

const RSVP_CHIP: Record<
  UpcomingEventItem["rsvpStatus"],
  { label: string; color: "success" | "warning" | "error" | "default" }
> = {
  GOING: { label: "Going", color: "success" },
  MAYBE: { label: "Maybe", color: "warning" },
  NOT_GOING: { label: "Not going", color: "error" },
  NO_RESPONSE: { label: "RSVP needed", color: "default" },
};

/**
 * Schedule-first dashboard widget: events across all the viewer's teams merged
 * with upcoming practice sessions for the next 14 days. Async RSC — fetches its
 * own data; wrap in <Suspense fallback={<UpcomingScheduleWidgetSkeleton />}>.
 */
export default async function UpcomingScheduleWidget({ userId }: { userId: string }) {
  const items = await getUpcomingSchedule(userId);

  return (
    <Card component="section">
      <CardHeader
        title="Upcoming schedule"
        subheader="Next 14 days across your teams"
        slotProps={{ title: { component: "h2" } }}
        action={
          <LinkButton href="/calendar" endIcon={<ArrowForwardIcon />} size="small">
            View calendar
          </LinkButton>
        }
      />

      {items.length === 0 ? (
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Nothing scheduled in the next 14 days.
          </Typography>
        </CardContent>
      ) : (
        <List disablePadding sx={{ py: 0.5 }}>
          {items.map((item) => (
            <LinkListItemButton
              key={`${item.kind}-${item.id}`}
              href={item.kind === "event" ? `/events/${item.id}` : `/practice-planner/${item.id}`}
              sx={{ borderRadius: 0, minHeight: 56, px: 2, gap: 1.5 }}
            >
              {item.kind === "event" && item.eventType === "GAME" ? (
                <EventIcon sx={{ color: "text.secondary", fontSize: 20, flexShrink: 0 }} />
              ) : (
                <SportsHockeyIcon sx={{ color: "text.secondary", fontSize: 20, flexShrink: 0 }} />
              )}
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }} noWrap>
                  {item.title}
                  {item.kind === "event" && item.opponent ? ` vs ${item.opponent}` : ""}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ color: "text.secondary" }}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Typography variant="caption">{item.teamName}</Typography>
                  <Typography variant="caption">
                    {item.kind === "event"
                      ? formatDateTimeInZone(item.startAt, item.timezone)
                      : new Date(item.startAt).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                  </Typography>
                  {item.kind === "event" && item.location ? (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <PlaceIcon sx={{ fontSize: 13 }} />
                      <Typography variant="caption">{item.location}</Typography>
                    </Stack>
                  ) : null}
                  {item.kind === "practice" ? (
                    <Typography variant="caption">
                      {item.duration} min · {item.playCount} play
                      {item.playCount !== 1 ? "s" : ""}
                    </Typography>
                  ) : null}
                </Stack>
              </Box>
              {item.kind === "event" ? (
                <Chip
                  label={RSVP_CHIP[item.rsvpStatus].label}
                  color={RSVP_CHIP[item.rsvpStatus].color}
                  size="small"
                  variant={item.rsvpStatus === "NO_RESPONSE" ? "outlined" : "filled"}
                  sx={{ flexShrink: 0 }}
                />
              ) : (
                <Chip label="Practice plan" size="small" variant="outlined" sx={{ flexShrink: 0 }} />
              )}
            </LinkListItemButton>
          ))}
        </List>
      )}
    </Card>
  );
}

export function UpcomingScheduleWidgetSkeleton() {
  return (
    <Card component="section">
      <CardHeader
        title={<Skeleton variant="text" width={160} />}
        subheader={<Skeleton variant="text" width={200} />}
      />
      <CardContent>
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={40} />
          <Skeleton variant="rounded" height={40} />
          <Skeleton variant="rounded" height={40} />
        </Stack>
      </CardContent>
    </Card>
  );
}
