import { redirect } from "next/navigation";
import { EventAvailable as EventIcon } from "@mui/icons-material";
import EventForm from "@/components/features/events/EventForm";
import { getUserAdminTeamContext, getUserTeamContext } from "@/lib/actions/team-context";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/NextLinkComposites";
import { getEventReservationOptions } from "../venue-reservation-options";

export default async function NewEventPage() {
  // Prefer any team the user administers so admins of a non-primary team
  // are not bounced back to the calendar.
  const context = await getUserAdminTeamContext();

  if (!context) {
    const memberContext = await getUserTeamContext();
    redirect(memberContext ? "/calendar" : "/");
  }
  const reservations = await getEventReservationOptions(context.teamId);

  return (
    <PageContainer maxWidth="md">
      <PageHeader
        icon={<EventIcon />}
        title="New event"
        subtitle="Schedule a game or practice and notify the team."
        actions={<LinkButton href="/calendar" variant="text">Back to calendar</LinkButton>}
      />
      <EventForm teamId={context.teamId} reservations={reservations} />
    </PageContainer>
  );
}
