import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Optional call-to-action (RSC-safe element). */
  action?: ReactNode;
}

/**
 * Centered empty-state panel: a dashed outline on the card surface so an
 * empty region reads as a deliberate placeholder rather than a page that
 * failed to load. Server-safe.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        py: { xs: 4, sm: 6 },
        px: 3,
        borderRadius: 2,
        border: "1px dashed var(--sp-border-input)",
      }}
    >
      {icon ? (
        <Box
          aria-hidden
          sx={{
            mb: 1.5,
            color: "text.secondary",
            display: "flex",
            "& .MuiSvgIcon-root": { fontSize: 32 },
          }}
        >
          {icon}
        </Box>
      ) : null}
      <Typography variant="subtitle1" component="h2">
        {title}
      </Typography>
      {description ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, maxWidth: 440 }}
        >
          {description}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: 2.5 }}>{action}</Box> : null}
    </Box>
  );
}
