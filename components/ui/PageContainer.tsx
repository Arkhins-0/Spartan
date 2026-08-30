import type { ReactNode } from "react";
import { Container, type ContainerProps } from "@mui/material";

export interface PageContainerProps {
  children: ReactNode;
  /** Override the dashboard-wide default width ("lg"). */
  maxWidth?: ContainerProps["maxWidth"];
  /** Remove the standard padding (e.g. for full-bleed editors). */
  disablePadding?: boolean;
}

/**
 * Standard dashboard page container. Padding is tighter than a marketing
 * page — the shell already insets the content pane — and tighter still on
 * phones, where every 8px of gutter is 4% of the screen. Server-safe.
 */
export function PageContainer({
  children,
  maxWidth = "lg",
  disablePadding = false,
}: PageContainerProps) {
  return (
    <Container
      maxWidth={maxWidth}
      disableGutters
      sx={{
        px: disablePadding ? 0 : { xs: 1.5, sm: 2, md: 3 },
        py: disablePadding ? 0 : { xs: 1.5, sm: 2, md: 2.5 },
      }}
    >
      {children}
    </Container>
  );
}
