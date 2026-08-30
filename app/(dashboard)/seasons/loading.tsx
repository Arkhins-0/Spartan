import { Skeleton, Stack } from "@mui/material";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeaderSkeleton } from "@/components/ui/PageHeaderSkeleton";

export default function SeasonsLoading() {
  return (
    <PageContainer maxWidth="md">
      <PageHeaderSkeleton />
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={88} />
        <Skeleton variant="rounded" height={88} />
        <Skeleton variant="rounded" height={88} />
      </Stack>
    </PageContainer>
  );
}
