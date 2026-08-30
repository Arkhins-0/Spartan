import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import StadiumIcon from "@mui/icons-material/Stadium";
import { LinkButton, LinkCardActionArea } from "@/components/ui/NextLinkComposites";
import { PageHeader } from "@/components/ui/PageHeader";
import type { PublicVenueProfile as PublicVenueProfileData, PublicVenueSummary } from "@/lib/utils/public-venues";

interface PublicVenueRelationship {
  id: string;
  relationshipType: string;
  targetType: string;
  targetName?: string | null;
  team?: { name: string } | null;
  league?: { name: string } | null;
}

/**
 * A brand colour is data, not a token: it shows up as a swatch beside the
 * title rather than as a painted hero, so the page stays scheme-aware and
 * never has to derive ink for an arbitrary background.
 */
function BrandSwatch({ color }: { color: string | null | undefined }) {
  if (!color) return <StadiumIcon />;
  return (
    <Box
      sx={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        bgcolor: color,
        border: "1px solid var(--sp-border)",
      }}
    />
  );
}

export function PublicVenueProfileCard({ venue }: { venue: PublicVenueSummary }) {
  const location = [venue.city, venue.state].filter(Boolean).join(", ");
  const body = (
    <CardContent>
      <Stack spacing={1}>
        <Box>
          <Typography variant="subtitle1" component="h2">
            {venue.name}
          </Typography>
          {location ? (
            <Typography variant="body2" color="text.secondary">
              {location}
            </Typography>
          ) : null}
        </Box>
        {venue.publicDescription ? (
          <Typography variant="body2" color="text.secondary">
            {venue.publicDescription}
          </Typography>
        ) : null}
      </Stack>
    </CardContent>
  );

  return (
    <Card sx={{ height: "100%" }}>
      {venue.slug ? (
        <LinkCardActionArea href={`/circuits/${venue.slug}`} sx={{ height: "100%", alignItems: "stretch" }}>
          {body}
        </LinkCardActionArea>
      ) : (
        body
      )}
    </Card>
  );
}

export function PublicVenueProfile({
  venue,
  relationships = [],
}: {
  venue: PublicVenueProfileData;
  relationships?: PublicVenueRelationship[];
}) {
  const location = [venue.city, venue.state].filter(Boolean).join(", ");
  const hasContact = Boolean(venue.publicEmail || venue.publicPhone || venue.website);

  return (
    <Stack spacing={2}>
      <PageHeader
        icon={<BrandSwatch color={venue.brandPrimaryColor} />}
        title={venue.name}
        subtitle={location || "Public circuit profile"}
        actions={
          venue.slug ? (
            <LinkButton href={`/circuits/${venue.slug}/schedule`} variant="contained">
              View full schedule
            </LinkButton>
          ) : undefined
        }
      />

      {venue.publicDescription ? (
        <Typography variant="body1" sx={{ maxWidth: "68ch" }}>
          {venue.publicDescription}
        </Typography>
      ) : null}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
        <Card sx={{ flex: 1 }}>
          <CardHeader title="Contact" />
          <CardContent>
            {hasContact ? (
              <Stack spacing={0.5} alignItems="flex-start">
                {venue.publicEmail ? <Typography variant="body2">{venue.publicEmail}</Typography> : null}
                {venue.publicPhone ? <Typography variant="body2">{venue.publicPhone}</Typography> : null}
                {venue.website ? (
                  <LinkButton
                    href={venue.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    size="small"
                    sx={{ mt: 0.5 }}
                  >
                    Visit website
                  </LinkButton>
                ) : null}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No public contact details.
              </Typography>
            )}
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardHeader title="Surfaces" subheader={`${venue.surfaces.length} listed`} />
          <CardContent>
            {venue.surfaces.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No surfaces listed.
              </Typography>
            ) : (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {venue.surfaces.map((surface) => (
                  <Chip key={surface.id} size="small" label={`${surface.name} (${surface.surfaceType})`} />
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>

      {relationships.length > 0 ? (
        <Card>
          <CardHeader title="Preferred and home teams" />
          <CardContent>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {relationships.map((relationship) => {
                const label =
                  relationship.team?.name ??
                  relationship.league?.name ??
                  relationship.targetName ??
                  relationship.targetType;
                return (
                  <Chip
                    key={relationship.id}
                    size="small"
                    variant={relationship.relationshipType === "HOME" ? "filled" : "outlined"}
                    label={`${label} (${relationship.relationshipType})`}
                  />
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Upcoming public schedule"
          subheader={
            venue.scheduleBlocks.length === 0
              ? "Nothing published yet"
              : `${venue.scheduleBlocks.length} block${venue.scheduleBlocks.length === 1 ? "" : "s"}`
          }
          action={
            venue.slug ? (
              <LinkButton href={`/circuits/${venue.slug}/schedule`} variant="outlined" size="small">
                View full schedule
              </LinkButton>
            ) : undefined
          }
        />
        {venue.scheduleBlocks.length === 0 ? (
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              No public schedule blocks are currently published.
            </Typography>
          </CardContent>
        ) : (
          <TableContainer sx={{ border: 0, borderRadius: 0, overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 520 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Block</TableCell>
                  <TableCell>Starts</TableCell>
                  <TableCell>Ends</TableCell>
                  <TableCell>Surface</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {venue.scheduleBlocks.map((block) => (
                  <TableRow key={block.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{block.title}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{new Date(block.startsAt).toLocaleString()}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{new Date(block.endsAt).toLocaleString()}</TableCell>
                    <TableCell>{block.surface?.name ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Stack>
  );
}
