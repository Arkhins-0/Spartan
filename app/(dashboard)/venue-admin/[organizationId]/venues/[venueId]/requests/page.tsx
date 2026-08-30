import { notFound } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { getVenueRequestQueue } from "@/lib/actions/venue-requests";
import { SurfaceTimeRequestQueue } from "@/components/features/venue-admin";

interface VenueRequestsPageProps {
  params: Promise<{
    organizationId: string;
    venueId: string;
  }>;
}

export default async function VenueRequestsPage({ params }: VenueRequestsPageProps) {
  const { organizationId, venueId } = await params;
  const result = await getVenueRequestQueue(organizationId, venueId);

  if (!result.success) {
    notFound();
  }

  return (
    <PageContainer>
      <PageHeader title="Track Time Requests" />
      <SurfaceTimeRequestQueue
        organizationId={organizationId}
        venueId={venueId}
        venueName={result.data.venueName}
        venueTimeZone={result.data.timezone}
        surfaceOptions={result.data.surfaceOptions}
        requests={result.data.requests}
      />
    </PageContainer>
  );
}
