import { Grid } from "@mui/material";
import StadiumIcon from "@mui/icons-material/Stadium";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PublicRinkProfileCard } from "@/components/features/venue-admin/PublicRinkProfile";
import { getPublicRinkSummaries } from "@/lib/actions/venue-organizations";

export const dynamic = "force-dynamic";

export default async function PublicRinksPage() {
  const rinks = await getPublicRinkSummaries();

  return (
    <PageContainer>
      <PageHeader
        icon={<StadiumIcon />}
        title="Find rinks"
        subtitle={
          rinks.length === 0
            ? "Published rink profiles, schedules, available ice, lessons and events"
            : `${rinks.length} published rink${rinks.length === 1 ? "" : "s"} · schedules, available ice, lessons and events`
        }
      />
      {rinks.length === 0 ? (
        <EmptyState
          icon={<StadiumIcon />}
          title="No rinks published yet"
          description="Rink profiles appear here as soon as a venue publishes one."
        />
      ) : (
        <Grid container spacing={2}>
          {rinks.map((rink) => (
            <Grid key={rink.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <PublicRinkProfileCard venue={rink} />
            </Grid>
          ))}
        </Grid>
      )}
    </PageContainer>
  );
}
