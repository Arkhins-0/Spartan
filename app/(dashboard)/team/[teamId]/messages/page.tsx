import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { Forum as ForumIcon } from "@mui/icons-material";
import { getTeamOverviewData } from "@/lib/actions/team-context";
import { getTeamMessages } from "@/lib/actions/communication";
import { LinkButton } from "@/components/ui/NextLinkComposites";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import TeamMessageComposer from "@/components/features/communication/TeamMessageComposer";

export const metadata: Metadata = {
  title: "Team Messages",
};

interface TeamMessagesPageProps {
  params: Promise<{ teamId: string }>;
}

function formatSentAt(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function TeamMessagesPage({ params }: TeamMessagesPageProps) {
  const { teamId } = await params;
  const team = await getTeamOverviewData(teamId);

  if (!team) {
    notFound();
  }

  const messagesResult = await getTeamMessages({ teamId, page: 1, limit: 20 });
  const messages = messagesResult.success ? messagesResult.data.messages : [];

  return (
    <PageContainer>
      <PageHeader
        icon={<ForumIcon />}
        title={`${team.name} messages`}
        subtitle={
          team.isAdmin
            ? `Announcements reach ${team.stats.members} member${team.stats.members === 1 ? "" : "s"}.`
            : "Announcements from your team admins."
        }
        actions={
          <LinkButton href={`/team/${team.id}`} variant="text">
            Back to team
          </LinkButton>
        }
      />

      <Stack spacing={2}>
        {team.isAdmin ? (
          <TeamMessageComposer teamId={team.id} memberCount={team.stats.members} />
        ) : null}

        <Card component="section">
          <CardHeader
            title="Message history"
            subheader={
              messages.length === 0
                ? "Nothing sent yet"
                : `${messages.length} most recent`
            }
            slotProps={{ title: { component: "h2" } }}
          />
          <CardContent>
            {messages.length === 0 ? (
              <EmptyState
                icon={<ForumIcon />}
                title="No messages yet"
                description={
                  team.isAdmin
                    ? "Send your team their first announcement using the box above."
                    : "This team hasn't sent any messages yet."
                }
              />
            ) : (
              <Stack spacing={2} divider={<Divider />}>
                {messages.map((message) => (
                  <Stack key={message.id} component="article" spacing={0.5}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="subtitle2" component="h3">
                        {message.subject}
                      </Typography>
                      {message.priority === "URGENT" ? (
                        <Chip size="small" color="error" label="Urgent" />
                      ) : message.priority === "HIGH" ? (
                        <Chip size="small" color="warning" label="High" />
                      ) : null}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {message.sender.name ?? message.sender.email} · {formatSentAt(message.createdAt)} ·{" "}
                      {message.recipientCount} recipient{message.recipientCount === 1 ? "" : "s"}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                      {message.content}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>
    </PageContainer>
  );
}
