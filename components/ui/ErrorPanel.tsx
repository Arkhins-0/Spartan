"use client";

import type { ReactNode } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

export interface ErrorPanelProps {
  title?: string;
  description?: string;
  /** Digest from the Next.js error boundary, shown small for support. */
  digest?: string;
  onRetry?: () => void;
  /** Extra actions (e.g. a link home) rendered beside "Try again". */
  actions?: ReactNode;
}

/**
 * Route-error panel shared by every error boundary: a centred card with an
 * error-coloured leading bar, one heavy line, one muted line, and the retry.
 * Deliberately calm — the page around it has already failed; the panel should
 * not shout as well.
 */
export function ErrorPanel({
  title = "Something went wrong",
  description = "We hit an unexpected error while loading this page. Try again, and if the problem persists, refresh the page or come back later.",
  digest,
  onRetry,
  actions,
}: ErrorPanelProps) {
  return (
    <Box
      sx={{
        minHeight: "50vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 1.5, sm: 2 },
        py: 4,
      }}
    >
      <Paper
        role="alert"
        sx={{
          maxWidth: 480,
          width: "100%",
          p: 3,
          borderLeftWidth: 3,
          borderLeftColor: "error.main",
        }}
      >
        <Stack spacing={1.5}>
          <Box sx={{ display: "flex", color: "error.main" }}>
            <ErrorOutlineIcon />
          </Box>
          <Typography variant="h3" component="h1">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
          {digest ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "var(--font-mono)" }}>
              Reference {digest}
            </Typography>
          ) : null}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ pt: 1 }}>
            {onRetry ? (
              <Button variant="contained" onClick={onRetry}>
                Try again
              </Button>
            ) : null}
            {actions}
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
