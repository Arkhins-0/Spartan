import { Skeleton, Stack } from "@mui/material";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeaderSkeleton } from "@/components/ui/PageHeaderSkeleton";

export default function MyRegistrationsLoading() {
  return (
    <PageContainer maxWidth="md">
      <PageHeaderSkeleton withActions={false} />
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={120} />
      </Stack>
    </PageContainer>
  );
}
