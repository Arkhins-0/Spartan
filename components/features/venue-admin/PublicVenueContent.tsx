import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, Grid, Stack, Typography } from "@mui/material";

interface PublicVenueContentProps {
  posts: Array<{ id: string; title: string; excerpt?: string | null; slug: string }>;
  lessons: Array<{ id: string; title: string; lessonType: string }>;
  events: Array<{ id: string; title: string; startsAt: Date | string }>;
}

export function PublicVenueContent({ posts, lessons, events }: PublicVenueContentProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        <ContentSection title="Training" count={lessons.length} empty="No training programmes are published yet.">
          {lessons.map((lesson) => (
            <Row key={lesson.id} primary={lesson.title} secondary={lesson.lessonType} />
          ))}
        </ContentSection>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <ContentSection title="Events" count={events.length} empty="No events are published yet.">
          {events.map((event) => (
            <Row
              key={event.id}
              primary={event.title}
              secondary={new Date(event.startsAt).toLocaleDateString()}
            />
          ))}
        </ContentSection>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <ContentSection title="Posts" count={posts.length} empty="No posts are published yet.">
          {posts.map((post) => (
            <Row key={post.id} primary={post.title} secondary={post.excerpt ?? undefined} />
          ))}
        </ContentSection>
      </Grid>
    </Grid>
  );
}

function Row({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <Stack spacing={0.25} sx={{ py: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {primary}
      </Typography>
      {secondary ? (
        <Typography variant="caption" color="text.secondary">
          {secondary}
        </Typography>
      ) : null}
    </Stack>
  );
}

function ContentSection({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: ReactNode[];
}) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardHeader title={title} subheader={count === 0 ? undefined : `${count} published`} />
      <CardContent sx={{ py: 1 }}>
        {children.length > 0 ? (
          <Stack divider={<span style={{ borderTop: "1px solid var(--sp-border)" }} />}>{children}</Stack>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            {empty}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
