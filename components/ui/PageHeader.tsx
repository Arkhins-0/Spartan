import type { ReactNode } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";

export interface PageHeaderProps {
  title: string;
  /** One line under the title: what this screen is for, or its status. */
  subtitle?: string;
  /** Leading icon, drawn muted at 20px. */
  icon?: ReactNode;
  /** Right-aligned action slot. From Server Components pass RSC-safe elements
   *  (e.g. LinkButton from components/ui/NextLinkComposites). */
  actions?: ReactNode;
  /** Optional breadcrumb element rendered above the bar. */
  breadcrumbs?: ReactNode;
}

/**
 * Standard page header, in the console "toolbar" idiom: one card-height bar
 * with icon / title + hint / actions, so every screen opens the same way and
 * the primary action is never more than a glance from the title. Server-safe.
 *
 * On phones the actions drop below the title and stretch, so a 44px button
 * never has to share a 360px row with a long title.
 */
export function PageHeader({ title, subtitle, icon, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <Box sx={{ mb: 2 }}>
      {breadcrumbs ? <Box sx={{ mb: 1 }}>{breadcrumbs}</Box> : null}
      <Paper
        component="header"
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          gap: { xs: 1.5, sm: 2 },
          px: 2,
          py: 1.5,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
          {icon ? (
            <Box
              aria-hidden
              sx={{
                display: "flex",
                flexShrink: 0,
                color: "text.secondary",
                "& .MuiSvgIcon-root": { fontSize: 22 },
              }}
            >
              {icon}
            </Box>
          ) : null}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: "1rem",
                fontWeight: 600,
                lineHeight: 1.3,
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: { sm: "nowrap" },
              }}
            >
              {title}
            </Typography>
            {subtitle ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.75rem", mt: 0.25 }}
              >
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Stack>
        {actions ? (
          <Box
            sx={{
              display: "flex",
              flexShrink: 0,
              gap: 1,
              flexWrap: "wrap",
              "& > *": { flex: { xs: "1 1 auto", sm: "0 0 auto" } },
            }}
          >
            {actions}
          </Box>
        ) : null}
      </Paper>
    </Box>
  );
}
