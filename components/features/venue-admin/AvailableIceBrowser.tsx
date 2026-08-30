import { Box, Button, Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import { formatDateTimeInZone } from "@/lib/utils/date";

interface AvailableIceBlock {
  id: string;
  title: string;
  startsAt: Date | string;
  endsAt: Date | string;
  surfaceName?: string | null;
  occupancy?: Array<{ startsAt: Date | string; endsAt: Date | string }>;
  remainingSlices?: Array<{ startsAt: Date | string; endsAt: Date | string }>;
}

function formatRange(
  startsAt: Date | string,
  endsAt: Date | string,
  timeZone: string,
): string {
  return `${formatDateTimeInZone(startsAt, timeZone)} – ${formatDateTimeInZone(
    endsAt,
    timeZone,
  )}`;
}

export function AvailableIceBrowser({
  blocks,
  timeZone,
  mode,
}: {
  blocks: AvailableIceBlock[];
  timeZone: string;
  mode: "public" | "staff";
}) {
  return (
    <Card component="section" aria-labelledby="available-ice-heading">
      <CardHeader
        title="Available ice"
        subheader={
          blocks.length === 0
            ? undefined
            : `${blocks.length} offering${blocks.length === 1 ? "" : "s"} · times in ${timeZone}`
        }
        slotProps={{ title: { id: "available-ice-heading", component: "h2" } }}
      />
      {blocks.length === 0 ? (
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            No available ice is currently published.
          </Typography>
        </CardContent>
      ) : (
        <Stack divider={<Box sx={{ borderTop: "1px solid var(--sp-border)" }} />}>
          {blocks.map((block) => (
            <Box key={block.id} sx={{ px: 2, py: 1.5 }}>
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" component="h3">
                  {block.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatRange(block.startsAt, block.endsAt, timeZone)}
                  {block.surfaceName ? ` · ${block.surfaceName}` : ""}
                </Typography>
                {mode === "staff" ? (
                  <Typography variant="body2" color="text.secondary">
                    Occupancy: {block.occupancy?.length
                      ? block.occupancy
                          .map((slice) =>
                            formatRange(slice.startsAt, slice.endsAt, timeZone),
                          )
                          .join(", ")
                      : "None"}
                  </Typography>
                ) : null}
                <Typography variant="body2" color="text.secondary">
                  Remaining: {block.remainingSlices?.length
                    ? block.remainingSlices
                        .map((slice) =>
                          formatRange(slice.startsAt, slice.endsAt, timeZone),
                        )
                        .join(", ")
                    : "No remaining slices"}
                </Typography>
                {mode === "public" && block.remainingSlices?.length ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
                    {block.remainingSlices.map((slice, index) => (
                      <Button
                        key={`${new Date(slice.startsAt).toISOString()}-${new Date(slice.endsAt).toISOString()}`}
                        href={`#request-${block.id}-${index}`}
                        variant="outlined"
                        sx={{ minHeight: 44 }}
                      >
                        Request this ice
                      </Button>
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Card>
  );
}
