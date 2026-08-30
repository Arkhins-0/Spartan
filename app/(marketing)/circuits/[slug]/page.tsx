import { notFound } from "next/navigation";
import { Stack } from "@mui/material";
import { PageContainer } from "@/components/ui/PageContainer";
import { PublicVenueContent, PublicVenueProfile } from "@/components/features/venue-admin";
import { PublicVenueMap } from "@/components/features/venues/PublicVenueMap";
import { getPublicVenueContent } from "@/lib/actions/venue-content";
import { getPublicVenueProfile } from "@/lib/actions/venue-organizations";
import { getPublicVenueRelationships } from "@/lib/actions/venue-relationships";
import type { VenueLayoutData } from "@/types/segments";

export const dynamic = "force-dynamic";

interface PublicCircuitPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicCircuitPage({ params }: PublicCircuitPageProps) {
  const { slug } = await params;
  const venue = await getPublicVenueProfile(slug);

  if (!venue) {
    notFound();
  }

  const [content, relationships] = await Promise.all([
    getPublicVenueContent(venue.id),
    getPublicVenueRelationships(venue.id),
  ]);

  // Optional schematic facility map (FR-017): render only when a layout has
  // been saved; otherwise the existing list presentation stands alone.
  const layout = (venue.layout as unknown as VenueLayoutData | null) ?? null;

  return (
    <PageContainer>
      <Stack spacing={2}>
        <PublicVenueProfile venue={venue} relationships={relationships} />
        {layout ? (
          <PublicVenueMap layout={layout} surfaces={venue.surfaces} venueName={venue.name} />
        ) : null}
        <PublicVenueContent posts={content.posts} lessons={content.lessons} events={content.events} />
      </Stack>
    </PageContainer>
  );
}
