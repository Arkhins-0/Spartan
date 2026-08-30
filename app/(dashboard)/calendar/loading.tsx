import { Box, Skeleton, Stack } from "@mui/material";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeaderSkeleton } from "@/components/ui/PageHeaderSkeleton";

export default function CalendarLoading() {
  return (
    <PageContainer>
      <PageHeaderSkeleton />
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Skeleton variant="rounded" width={36} height={36} />
        <Skeleton variant="rounded" width={36} height={36} />
        <Skeleton variant="rounded" width={72} height={36} />
        <Skeleton variant="text" width={140} sx={{ fontSize: "1rem", ml: 1 }} />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Skeleton variant="rounded" width={96} height={24} sx={{ borderRadius: 12 }} />
        <Skeleton variant="rounded" width={112} height={24} sx={{ borderRadius: 12 }} />
        <Skeleton variant="rounded" width={88} height={24} sx={{ borderRadius: 12 }} />
      </Stack>
      <Box
        sx={{
          display: { xs: "none", md: "grid" },
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 0.5,
        }}
      >
        {Array.from({ length: 35 }, (_, index) => (
          <Skeleton key={index} variant="rounded" height={104} />
        ))}
      </Box>
      <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" } }}>
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} variant="rounded" height={64} />
        ))}
      </Stack>
    </PageContainer>
  );
}
