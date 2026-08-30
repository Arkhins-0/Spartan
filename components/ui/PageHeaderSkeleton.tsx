import { Box, Paper, Skeleton, Stack } from "@mui/material";

/**
 * Loading-state stand-in for PageHeader: the same card-height bar so the
 * page does not jump when the real header streams in. Server-safe.
 */
export function PageHeaderSkeleton({ withActions = true }: { withActions?: boolean }) {
  return (
    <Paper
      aria-hidden
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: 2,
        py: 1.5,
        mb: 2,
        minHeight: 60,
      }}
    >
      <Skeleton variant="rounded" width={22} height={22} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width={180} sx={{ fontSize: "1rem" }} />
        <Skeleton variant="text" width={260} sx={{ fontSize: "0.75rem" }} />
      </Box>
      {withActions ? (
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rounded" width={96} height={36} />
        </Stack>
      ) : null}
    </Paper>
  );
}
