import { notFound } from "next/navigation";
import { Stack } from "@mui/material";
import { People as PeopleIcon } from "@mui/icons-material";
import RosterList from "@/components/features/roster/RosterList";
import InvitationManager from "@/components/features/roster/InvitationManager";
import { getTeamRosterDataById } from "@/lib/actions/team-context";
import { LinkButton } from "@/components/ui/NextLinkComposites";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";

interface TeamRosterPageProps {
  params: Promise<{ teamId: string }>;
}

export default async function TeamRosterPage({ params }: TeamRosterPageProps) {
  const { teamId } = await params;
  const data = await getTeamRosterDataById(teamId);

  if (!data) {
    notFound();
  }

  const playerCount = data.players.length;
  const pendingCount = data.invitations?.length ?? 0;
  const subtitleParts = [`${playerCount} player${playerCount === 1 ? "" : "s"}`];
  if (data.isAdmin) {
    subtitleParts.push(`${pendingCount} pending invite${pendingCount === 1 ? "" : "s"}`);
  }

  return (
    <PageContainer>
      <PageHeader
        icon={<PeopleIcon />}
        title={`${data.teamName} roster`}
        subtitle={subtitleParts.join(" · ")}
        actions={
          <LinkButton href={`/team/${teamId}`} variant="text">
            Back to team
          </LinkButton>
        }
      />

      <Stack spacing={2}>
        {data.isAdmin && (
          <InvitationManager invitations={data.invitations} teamId={data.teamId} />
        )}

        <RosterList
          players={data.players}
          teamMembers={data.teamMembers}
          teamId={data.teamId}
          isAdmin={data.isAdmin}
        />
      </Stack>
    </PageContainer>
  );
}
