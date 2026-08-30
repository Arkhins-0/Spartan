"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, ButtonBase } from "@mui/material";
import { useLeague } from "@/components/providers/LeagueProvider";
import { getNavSections, isNavItemActive } from "@/components/features/dashboard/navItems";

interface MobileNavigationProps {
  isLeagueMode?: boolean;
  isPlatformAdmin?: boolean;
}

/**
 * Below `md` the rail becomes a horizontally scrolling chip row pinned under
 * the top bar. Every destination the desktop rail has is here — same list,
 * same order — so nothing is hidden behind a "more" menu, and the active chip
 * scrolls itself into view so the row always shows where you are.
 */
export default function MobileNavigation({
  isLeagueMode = false,
  isPlatformAdmin = false,
}: MobileNavigationProps) {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement | null>(null);
  // The shell always renders inside LeagueProvider (app/(dashboard)/layout.tsx).
  const { currentLeague } = useLeague();

  const items = getNavSections({ isLeagueMode, isPlatformAdmin, currentLeague }).flatMap(
    (section) => section.items
  );

  useEffect(() => {
    const node = activeRef.current;
    if (node && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ inline: "center", block: "nearest" });
    }
  }, [pathname]);

  return (
    <Box
      component="nav"
      aria-label="Pages"
      className="ol-scroll-row"
      sx={{
        display: { xs: "flex", md: "none" },
        gap: 0.75,
        overflowX: "auto",
        px: 1.5,
        py: 1,
        bgcolor: "background.paper",
        borderBottom: "1px solid var(--sp-border)",
        // The row is the affordance; a fade on the trailing edge says "more".
        maskImage: "linear-gradient(to right, black calc(100% - 24px), transparent)",
      }}
    >
      {items.map((item) => {
        const active = isNavItemActive(pathname, item);
        return (
          <ButtonBase
            key={item.path}
            component={Link}
            href={item.path}
            ref={active ? activeRef : undefined}
            aria-current={active ? "page" : undefined}
            sx={{
              flexShrink: 0,
              height: 36,
              px: 1.5,
              borderRadius: 999,
              fontSize: "0.8125rem",
              fontWeight: active ? 600 : 500,
              fontFamily: "inherit",
              border: "1px solid",
              borderColor: active ? "primary.main" : "var(--sp-border-input)",
              bgcolor: active ? "primary.main" : "transparent",
              color: active ? "primary.contrastText" : "text.secondary",
              whiteSpace: "nowrap",
              transition: "background-color 0.15s ease, color 0.15s ease",
              "&:active": { transform: "scale(0.97)" },
            }}
          >
            {item.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
