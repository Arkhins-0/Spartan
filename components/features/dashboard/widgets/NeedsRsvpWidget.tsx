import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { CheckCircleOutline as CheckCircleOutlineIcon } from "@mui/icons-material";
import { LinkMuiLink } from "@/components/ui/NextLinkComposites";
import { RSVPButtons } from "@/components/features/events/RSVPButtons";
import { getNeedsRsvp } from "@/lib/data/dashboard";
import { formatDateTimeInZone } from "@/lib/utils/date";

/**
 * The viewer's pending RSVPs on future events, one row per identity (self and
 * each guarded player, per the getNeedsRsvp contract), with inline RSVP
 * response. Async RSC — the only client leaf is the reused RSVPButtons
 * component (all props crossing that boundary are serializable strings). Wrap
 * in <Suspense fallback={<NeedsRsvpWidgetSkeleton />}>.
 */
export default async function NeedsRsvpWidget({ userId }: { userId: string }) {
  const items = await getNeedsRsvp(userId);

  return (
    <Card component="section">
      <CardHeader
        title="Needs your RSVP"
        subheader={
          items.length === 0
            ? "Nothing waiting"
            : `${items.length} response${items.length === 1 ? "" : "s"} outstanding`
        }
        slotProps={{ title: { component: "h2" } }}
      />
      <CardContent>
        {items.length === 0 ? (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ color: "text.secondary" }}>
            <CheckCircleOutlineIcon fontSize="small" color="success" />
            <Typography variant="body2">
              You&apos;re all caught up — no RSVPs waiting.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2} divider={<Divider />}>
            {items.map((item) => {
              const target = item.target;
              const key = `${item.eventId}:${
                target.kind === "player" ? target.playerId : "self"
              }`;
              return (
                <Stack key={key} spacing={1.5}>
                  <Box>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <LinkMuiLink
                        href={`/events/${item.eventId}`}
                        variant="body2"
                        color="inherit"
                        underline="hover"
                        sx={{ fontWeight: 600 }}
                      >
                        {item.title}
                        {item.opponent ? ` vs ${item.opponent}` : ""}
                      </LinkMuiLink>
                      {target.kind === "player" && (
                        <Chip label={`For ${target.playerName}`} size="small" variant="outlined" />
                      )}
                    </Stack>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{ color: "text.secondary" }}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Typography variant="caption">{item.teamName}</Typography>
                      <Typography variant="caption">
                        {formatDateTimeInZone(item.startAt, item.timezone)}
                      </Typography>
                      {item.location ? (
                        <Typography variant="caption">{item.location}</Typography>
                      ) : null}
                    </Stack>
                  </Box>
                  <RSVPButtons
                    eventId={item.eventId}
                    currentStatus="NO_RESPONSE"
                    playerId={target.kind === "player" ? target.playerId : undefined}
                  />
                </Stack>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export function NeedsRsvpWidgetSkeleton() {
  return (
    <Card component="section">
      <CardHeader
        title={<Skeleton variant="text" width={140} />}
        subheader={<Skeleton variant="text" width={180} />}
      />
      <CardContent>
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={96} />
          <Skeleton variant="rounded" height={96} />
        </Stack>
      </CardContent>
    </Card>
  );
}
