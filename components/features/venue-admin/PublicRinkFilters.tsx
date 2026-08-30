import { Stack, Typography } from "@mui/material";
import { LinkChip } from "@/components/ui/NextLinkComposites";

interface PublicRinkFilterOption {
  id: string;
  label: string;
}

/**
 * Skill-level filter: a wrapping row of link chips on its own line, per the
 * console brief, so it never competes with actions for a narrow screen.
 */
export function PublicRinkFilters({ skillLevels, basePath }: { skillLevels: PublicRinkFilterOption[]; basePath: string }) {
  if (skillLevels.length === 0) {
    return null;
  }

  return (
    <Stack spacing={0.75}>
      <Typography variant="eyebrow" component="p">
        Filter by level
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {skillLevels.map((level) => (
          <LinkChip
            key={level.id}
            href={`${basePath}?level=${level.id}`}
            clickable
            variant="outlined"
            size="medium"
            label={level.label}
          />
        ))}
      </Stack>
    </Stack>
  );
}
