import { notFound, redirect } from "next/navigation";
import { Chip, Stack, Typography } from "@mui/material";
import ArticleIcon from "@mui/icons-material/Article";

import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/NextLinkComposites";
import { getPublicContentItem } from "@/lib/actions/public-content";
import { formatDateTime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

/** One public announcement or news item. */
export default async function PublicNewsItemPage({
  params,
}: {
  params: Promise<{ slug: string; contentSlug: string }>;
}) {
  const { slug, contentSlug } = await params;
  const result = await getPublicContentItem(slug, contentSlug);
  if (!result) notFound();

  const { item, association } = result;
  if (association.slug !== slug) {
    redirect(`/associations/${association.slug}/news/${contentSlug}`);
  }

  const subtitle = [association.name, item.publishAt ? formatDateTime(item.publishAt) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageContainer maxWidth="md">
      <PageHeader
        icon={<ArticleIcon />}
        title={item.title}
        subtitle={subtitle}
        actions={
          <LinkButton href={`/associations/${association.slug}`} variant="outlined">
            {association.name}
          </LinkButton>
        }
      />

      <Stack component="article" spacing={2} sx={{ maxWidth: "68ch" }}>
        {item.team ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={item.team.name} />
          </Stack>
        ) : null}

        {/* Rendered as text, not HTML: the body is stored exactly as authored
            and React escapes it here, so a post can never inject markup. */}
        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", fontSize: "1rem", lineHeight: 1.65 }}>
          {item.body}
        </Typography>
      </Stack>
    </PageContainer>
  );
}
