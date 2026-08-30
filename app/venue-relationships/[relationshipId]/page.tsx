import { notFound } from "next/navigation";
import HandshakeIcon from "@mui/icons-material/Handshake";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { getVenueRelationshipInvitation } from "@/lib/actions/venue-relationships";
import { VenueRelationshipInvitation } from "@/components/features/venue-admin";

export const dynamic = "force-dynamic";

interface VenueRelationshipInvitationPageProps {
  params: Promise<{ relationshipId: string }>;
}

export default async function VenueRelationshipInvitationPage({ params }: VenueRelationshipInvitationPageProps) {
  const { relationshipId } = await params;
  const result = await getVenueRelationshipInvitation(relationshipId);

  if (!result.success) {
    notFound();
  }

  return (
    <PageContainer maxWidth="sm">
      <PageHeader
        icon={<HandshakeIcon />}
        title="Review rink invitation"
        subtitle={`${result.data.venueName} · ${result.data.relationshipType.toLowerCase()} rink`}
      />
      <VenueRelationshipInvitation
        relationshipId={result.data.relationshipId}
        venueName={result.data.venueName}
        relationshipType={result.data.relationshipType.toLowerCase()}
      />
    </PageContainer>
  );
}
