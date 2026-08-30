import { Box, Skeleton, Stack } from "@mui/material";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeaderSkeleton } from "@/components/ui/PageHeaderSkeleton";

export default function DashboardHomeLoading() {
  return (
    <PageContainer>
      <PageHeaderSkeleton withActions={false} />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        <Skeleton variant="rounded" height={200} />
        <Skeleton variant="rounded" height={200} />
        <Skeleton variant="rounded" height={200} />
      </Box>
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Skeleton variant="rounded" height={160} />
        <Skeleton variant="rounded" height={160} />
      </Stack>
    </PageContainer>
  );
}
