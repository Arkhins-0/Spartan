import {
  Avatar,
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
import GroupsIcon from "@mui/icons-material/Groups";

import { LinkButton, LinkCardActionArea, LinkMuiLink } from "@/components/ui/NextLinkComposites";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatSport } from "@/lib/utils/validation";

/**
 * The public association landing page (feature 007 / User Story 4).
 *
 * SC-007 requires every published team, the public schedule, public signup
 * events, public announcements, and an active public wishlist to be reachable
 * from here in no more than three activations. Everything below is one
 * activation away, which leaves two to spare for the pages themselves.
 *
 * A Server Component: all links go through the NextLinkComposites wrappers.
 * `component={Link}` on a MUI element from an RSC compiles, type-checks, and
 * passes tests, then crashes at runtime.
 */

export interface PublicAssociationProfileProps {
  association: {
    id: string;
    name: string;
    slug: string | null;
    sport: string;
    publicDescription: string | null;
    logoUrl: string | null;
    brandPrimaryColor: string | null;
    brandSecondaryColor: string | null;
    publicEmail: string | null;
    publicPhone: string | null;
    divisions: Array<{ id: string; name: string; ageGroup: string | null }>;
    teams: Array<{
      id: string;
      name: string;
      slug: string | null;
      season: string;
      division: { name: string; ageGroup: string | null } | null;
    }>;
    publicContentItems: Array<{
      id: string;
      slug: string;
      title: string;
      summary: string | null;
      publishAt: Date | null;
      team: { name: string; slug: string | null } | null;
    }>;
    gearWishlist: { shareToken: string; title: string } | null;
  };
}

/**
 * Brand colours are data, not tokens. They appear as a swatch in the header's
 * icon slot (or the logo when there is one) instead of a painted hero, so the
 * page stays scheme-aware and never has to derive ink for an arbitrary
 * background.
 */
function BrandMark({
  logoUrl,
  color,
}: {
  logoUrl: string | null;
  color: string | null;
}) {
  if (logoUrl) {
    return <Avatar src={logoUrl} alt="" variant="rounded" sx={{ width: 40, height: 40 }} />;
  }
  if (color) {
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
  return <GroupsIcon />;
}

export function PublicAssociationProfile({ association }: PublicAssociationProfileProps) {
  const base = `/associations/${association.slug}`;

  return (
    <Stack spacing={2}>
      <PageHeader
        icon={<BrandMark logoUrl={association.logoUrl} color={association.brandPrimaryColor} />}
        title={association.name}
        subtitle={`${formatSport(association.sport)} · ${association.teams.length} published team${association.teams.length === 1 ? "" : "s"}`}
        actions={
          <>
            <LinkButton href={`${base}/schedule`} variant="contained">
              Schedule
            </LinkButton>
            <LinkButton href={`${base}/teams`} variant="outlined">
              Teams
            </LinkButton>
            <LinkButton href={`${base}/events`} variant="outlined">
              Events &amp; registration
            </LinkButton>
            <LinkButton href={`${base}/news`} variant="outlined">
              News
            </LinkButton>
            {/* Linked only while the wishlist is published. The token route is the
                existing hardened public surface; no inventory, donor, custodian, or
                location data is read here to render this button. */}
            {association.gearWishlist ? (
              <LinkButton href={`/gear-wishlist/${association.gearWishlist.shareToken}`} variant="outlined">
                {association.gearWishlist.title}
              </LinkButton>
            ) : null}
          </>
        }
      />

      {association.publicDescription ? (
        <Typography variant="body1" sx={{ maxWidth: "68ch" }}>
          {association.publicDescription}
        </Typography>
      ) : null}

      {association.teams.length > 0 ? (
        <Card component="section" aria-labelledby="association-teams-heading">
          <CardHeader
            title="Teams"
            subheader={`${association.teams.length} published`}
            slotProps={{ title: { id: "association-teams-heading", component: "h2" } }}
            action={
              <LinkButton href={`${base}/teams`} variant="text" size="small">
                All teams
              </LinkButton>
            }
          />
          <TableContainer sx={{ border: 0, borderRadius: 0, overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 420 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Team</TableCell>
                  <TableCell>Division · season</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {association.teams.map((team) => (
                  <TableRow key={team.id} hover>
                    <TableCell>
                      <LinkMuiLink href={`${base}/teams/${team.slug}`} color="inherit" sx={{ fontWeight: 600 }}>
                        {team.name}
                      </LinkMuiLink>
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {team.division?.name ?? "No division"} · {team.season}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      ) : null}

      {association.publicContentItems.length > 0 ? (
        <Box component="section" aria-labelledby="association-news-heading">
          <Typography id="association-news-heading" variant="h5" component="h2" sx={{ mb: 1 }}>
            News
          </Typography>
          <Stack spacing={1.5}>
            {association.publicContentItems.map((item) => (
              <Card key={item.id}>
                <LinkCardActionArea href={`${base}/news/${item.slug}`}>
                  <CardContent>
                    <Typography variant="subtitle1" component="h3">
                      {item.title}
                    </Typography>
                    {item.summary ? (
                      <Typography variant="body2" color="text.secondary">
                        {item.summary}
                      </Typography>
                    ) : null}
                    {item.team ? (
                      <Chip size="small" label={item.team.name} sx={{ mt: 1 }} />
                    ) : null}
                  </CardContent>
                </LinkCardActionArea>
              </Card>
            ))}
          </Stack>
        </Box>
      ) : null}

      {association.divisions.length > 0 ? (
        <Card component="section" aria-labelledby="association-divisions-heading">
          <CardHeader
            title="Divisions"
            slotProps={{ title: { id: "association-divisions-heading", component: "h2" } }}
          />
          <CardContent>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {association.divisions.map((division) => (
                <Chip
                  key={division.id}
                  size="small"
                  label={
                    division.ageGroup ? `${division.name} · ${division.ageGroup}` : division.name
                  }
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {association.publicEmail || association.publicPhone ? (
        <Card component="section" aria-labelledby="association-contact-heading">
          <CardHeader
            title="Contact"
            slotProps={{ title: { id: "association-contact-heading", component: "h2" } }}
          />
          {/* The association's *public* contact details, which an administrator
              opts into. League.contactEmail / contactPhone are the private
              administrative contact and are never selected for this page. */}
          <CardContent>
            <Stack spacing={0.5}>
              {association.publicEmail ? (
                <Typography variant="body2">{association.publicEmail}</Typography>
              ) : null}
              {association.publicPhone ? (
                <Typography variant="body2">{association.publicPhone}</Typography>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}

export default PublicAssociationProfile;
