import { notFound, redirect } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import NewspaperIcon from "@mui/icons-material/Newspaper";

import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton, LinkCardActionArea } from "@/components/ui/NextLinkComposites";
import { resolvePublicAssociation } from "@/lib/actions/association-profile";
import { listPublicAssociationContentPage } from "@/lib/actions/public-content";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function PublicAssociationNewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { slug } = await params;
  const rawPage = (await searchParams).page;
  const parsedPage = Number(Array.isArray(rawPage) ? rawPage[0] : rawPage);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const association = await resolvePublicAssociation(slug);
  if (!association) notFound();
  if (association.canonicalSlug !== slug) {
    redirect(
      `/associations/${association.canonicalSlug}/news${page > 1 ? `?page=${page}` : ""}`,
    );
  }

  const result = await listPublicAssociationContentPage(
    association.id,
    page,
    PAGE_SIZE,
  );
  if (page > result.totalPages) notFound();

  const base = `/associations/${association.canonicalSlug}`;

  return (
    <PageContainer maxWidth="md">
      <PageHeader
        icon={<NewspaperIcon />}
        title="News"
        subtitle={
          result.totalPages > 1
            ? `Public announcements from the association and its teams · page ${page} of ${result.totalPages}`
            : "Public announcements from the association and its teams"
        }
        actions={
          <LinkButton href={base} variant="outlined">
            Back to association
          </LinkButton>
        }
      />

      <Stack spacing={2}>
        {result.items.length === 0 ? (
          <EmptyState
            icon={<NewspaperIcon />}
            title="No public announcements yet"
            description="Announcements appear here once the association publishes them."
          />
        ) : (
          <Stack spacing={1.5}>
            {result.items.map((item) => (
              <Card key={item.id}>
                <LinkCardActionArea href={`${base}/news/${item.slug}`}>
                  <CardContent>
                    <Typography variant="subtitle1" component="h2">
                      {item.title}
                    </Typography>
                    {item.summary ? (
                      <Typography variant="body2" color="text.secondary">
                        {item.summary}
                      </Typography>
                    ) : null}
                  </CardContent>
                </LinkCardActionArea>
              </Card>
            ))}
          </Stack>
        )}

        {result.totalPages > 1 ? (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ sm: "center" }}
          >
            <Stack direction="row" spacing={1}>
              {page > 1 ? (
                <LinkButton href={`${base}/news?page=${page - 1}`} variant="outlined">
                  Previous
                </LinkButton>
              ) : null}
              {page < result.totalPages ? (
                <LinkButton href={`${base}/news?page=${page + 1}`} variant="outlined">
                  Next
                </LinkButton>
              ) : null}
            </Stack>
            <Box
              component="form"
              method="get"
              action={`${base}/news`}
              sx={{ display: "flex", gap: 1, alignItems: "center" }}
            >
              <TextField
                name="page"
                label="Page"
                type="number"
                defaultValue={page}
                size="small"
                slotProps={{ htmlInput: { min: 1, max: result.totalPages } }}
                sx={{ width: 110 }}
              />
              <Button type="submit" variant="outlined">
                Go
              </Button>
              <Typography variant="body2" color="text.secondary">
                of {result.totalPages}
              </Typography>
            </Box>
          </Stack>
        ) : null}
      </Stack>
    </PageContainer>
  );
}
