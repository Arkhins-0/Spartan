import { Box, Skeleton } from "@mui/material";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeaderSkeleton } from "@/components/ui/PageHeaderSkeleton";

export default function VenuesLoading() {
  return (
    <PageContainer>
      <PageHeaderSkeleton />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
          gap: 2,
        }}
      >
        <Skeleton variant="rounded" height={160} />
        <Skeleton variant="rounded" height={160} />
        <Skeleton variant="rounded" height={160} />
        <Skeleton variant="rounded" height={160} />
      </Box>
    </PageContainer>
  );
}
