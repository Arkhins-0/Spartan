import { Grid } from "@mui/material";
import StadiumIcon from "@mui/icons-material/Stadium";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PublicVenueProfileCard } from "@/components/features/venue-admin/PublicVenueProfile";
import { getPublicCircuitSummaries } from "@/lib/actions/venue-organizations";

export const dynamic = "force-dynamic";

export default async function PublicCircuitsPage() {
  const circuits = await getPublicCircuitSummaries();

  return (
    <PageContainer>
      <PageHeader
        icon={<StadiumIcon />}
        title="Find circuits"
        subtitle={
          circuits.length === 0
            ? "Published circuit profiles, schedules, available track time, programmes and events"
            : `${circuits.length} published circuit${circuits.length === 1 ? "" : "s"} · schedules, available track time, programmes and events`
        }
      />
      {circuits.length === 0 ? (
        <EmptyState
          icon={<StadiumIcon />}
          title="No circuits published yet"
          description="Circuit profiles appear here as soon as a venue publishes one."
        />
      ) : (
        <Grid container spacing={2}>
          {circuits.map((circuit) => (
            <Grid key={circuit.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <PublicVenueProfileCard venue={circuit} />
            </Grid>
          ))}
        </Grid>
      )}
    </PageContainer>
  );
}
