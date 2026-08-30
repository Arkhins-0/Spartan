import { Skeleton, Stack } from "@mui/material";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeaderSkeleton } from "@/components/ui/PageHeaderSkeleton";

export default function VenueAdminLoading() {
  return (
    <PageContainer>
      <PageHeaderSkeleton />
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={140} />
        <Skeleton variant="rounded" height={140} />
        <Skeleton variant="rounded" height={140} />
      </Stack>
    </PageContainer>
  );
}
