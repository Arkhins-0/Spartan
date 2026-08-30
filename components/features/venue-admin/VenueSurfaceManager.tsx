import { Card, CardContent, Chip, Stack, Typography } from "@mui/material";

interface VenueSurfaceSummary {
  id: string;
  name: string;
  surfaceType: string;
  isActive: boolean;
  capacity?: number | null;
}

interface VenueSurfaceManagerProps {
  organizationId: string;
  venueId: string;
  surfaces?: VenueSurfaceSummary[];
}

export function VenueSurfaceManager({ organizationId, venueId, surfaces = [] }: VenueSurfaceManagerProps) {
  return (
    <Card aria-labelledby="surfaces-heading">
      <CardContent>
        <Stack spacing={2} data-organization-id={organizationId} data-venue-id={venueId}>
          <Typography id="surfaces-heading" variant="h6" component="h2">
            Surfaces
          </Typography>
          {surfaces.length > 0 ? (
            <Stack spacing={1}>
              {surfaces.map((surface) => (
                <Stack key={surface.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography fontWeight={700}>{surface.name}</Typography>
                  <Chip size="small" label={surface.surfaceType} />
                  <Chip size="small" color={surface.isActive ? "success" : "default"} label={surface.isActive ? "Active" : "Archived"} />
                  {surface.capacity ? <Typography variant="body2">Capacity {surface.capacity}</Typography> : null}
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No surfaces have been added yet.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}