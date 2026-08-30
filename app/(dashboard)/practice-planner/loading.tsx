import { Skeleton, Stack } from "@mui/material";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeaderSkeleton } from "@/components/ui/PageHeaderSkeleton";

export default function PracticePlannerLoading() {
  return (
    <PageContainer>
      <PageHeaderSkeleton />
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={104} />
        <Skeleton variant="rounded" height={104} />
        <Skeleton variant="rounded" height={104} />
      </Stack>
    </PageContainer>
  );
}
