import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { MailOutline as MailOutlineIcon } from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import { LinkMuiLink } from "@/components/ui/NextLinkComposites";
import { getRecentMessages } from "@/lib/data/dashboard";

/**
 * Teasers for the viewer's most recently received league messages, each
 * linking to the sending league's messages page. Async RSC — mount only for
 * viewers with league memberships; wrap in
 * <Suspense fallback={<RecentMessagesWidgetSkeleton />}>.
 */
export default async function RecentMessagesWidget({ userId }: { userId: string }) {
  const messages = await getRecentMessages(userId);

  return (
    <Card component="section">
      <CardHeader
        title="Recent messages"
        subheader="League and team announcements"
        slotProps={{ title: { component: "h2" } }}
      />
      <CardContent>
        {messages.length === 0 ? (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ color: "text.secondary" }}>
            <MailOutlineIcon fontSize="small" />
            <Typography variant="body2">League announcements will appear here.</Typography>
          </Stack>
        ) : (
          <Stack spacing={1.5} divider={<Divider />}>
            {messages.map((message) => (
              <Stack key={message.id} spacing={0.5}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
                >
                  <LinkMuiLink
                    href={
                      message.scope.kind === "league"
                        ? `/league/${message.scope.id}/messages`
                        : `/team/${message.scope.id}/messages`
                    }
                    variant="body2"
                    color="inherit"
                    underline="hover"
                    sx={{ fontWeight: 600 }}
                  >
                    {message.subject}
                  </LinkMuiLink>
                  <Chip size="small" label={message.scope.name} />
                </Stack>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ color: "text.secondary" }}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Typography variant="caption">{message.senderName}</Typography>
                  <Typography variant="caption">
                    {formatDistanceToNow(new Date(message.sentAt), { addSuffix: true })}
                  </Typography>
                </Stack>
                {message.snippet ? (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {message.snippet}
                  </Typography>
                ) : null}
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentMessagesWidgetSkeleton() {
  return (
    <Card component="section">
      <CardHeader
        title={<Skeleton variant="text" width={150} />}
        subheader={<Skeleton variant="text" width={200} />}
      />
      <CardContent>
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={64} />
          <Skeleton variant="rounded" height={64} />
        </Stack>
      </CardContent>
    </Card>
  );
}
