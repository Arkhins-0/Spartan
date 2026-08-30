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
  MailOutline as MailOutlineIcon,
  HelpOutline as HelpOutlineIcon,
} from "@mui/icons-material";
import { LinkListItemButton } from "@/components/ui/NextLinkComposites";
import { getAdminAttention } from "@/lib/data/dashboard";
import { formatDateTimeInZone } from "@/lib/utils/date";

/**
 * Admin-only attention items: upcoming events with unanswered RSVPs and
 * pending invitations, for teams the viewer administers. Renders nothing for
 * non-admins or when nothing needs attention. Async RSC — wrap in
 * <Suspense fallback={<AdminAttentionWidgetSkeleton />}>.
 */
export default async function AdminAttentionWidget({ userId }: { userId: string }) {
  const attention = await getAdminAttention(userId);
  if (!attention) return null;

  const { events, pendingInvitations } = attention;
  if (events.length === 0 && pendingInvitations.length === 0) return null;

  const total = events.length + pendingInvitations.length;

  return (
    <Card component="section">
      <CardHeader
        title="Needs your attention"
        subheader={`${total} item${total === 1 ? "" : "s"} for teams you administer`}
        slotProps={{ title: { component: "h2" } }}
      />

      <List disablePadding sx={{ py: 0.5 }}>
        {events.map((event) => (
          <LinkListItemButton
            key={event.id}
            href={`/events/${event.id}`}
            sx={{ borderRadius: 0, minHeight: 56, px: 2, gap: 1.5 }}
          >
            <HelpOutlineIcon sx={{ color: "warning.main", fontSize: 20, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }} noWrap>
                {event.title}
              </Typography>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ color: "text.secondary" }}
                flexWrap="wrap"
                useFlexGap
              >
                <Typography variant="caption">{event.teamName}</Typography>
                <Typography variant="caption">
                  {formatDateTimeInZone(event.startAt, event.timezone)}
                </Typography>
              </Stack>
            </Box>
            <Chip
              label={`${event.noResponseCount} unanswered RSVP${
                event.noResponseCount !== 1 ? "s" : ""
              }`}
              color="warning"
              size="small"
              variant="outlined"
              sx={{ flexShrink: 0 }}
            />
          </LinkListItemButton>
        ))}

        {pendingInvitations.map((invitation) => (
          <LinkListItemButton
            key={invitation.teamId}
            href={`/team/${invitation.teamId}/roster`}
            sx={{ borderRadius: 0, minHeight: 56, px: 2, gap: 1.5 }}
          >
            <MailOutlineIcon sx={{ color: "text.secondary", fontSize: 20, flexShrink: 0 }} />
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "text.primary", minWidth: 0, flex: 1 }}
              noWrap
            >
              {invitation.teamName}
            </Typography>
            <Chip
              label={`${invitation.count} pending invitation${
                invitation.count !== 1 ? "s" : ""
              }`}
              size="small"
              variant="outlined"
              sx={{ flexShrink: 0 }}
            />
          </LinkListItemButton>
        ))}
      </List>
    </Card>
  );
}

export function AdminAttentionWidgetSkeleton() {
  return (
    <Card component="section">
      <CardHeader
        title={<Skeleton variant="text" width={170} />}
        subheader={<Skeleton variant="text" width={220} />}
      />
      <CardContent>
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={40} />
          <Skeleton variant="rounded" height={40} />
        </Stack>
      </CardContent>
    </Card>
  );
}
