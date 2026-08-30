"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import { useLeague } from "@/components/providers/LeagueProvider";
import { getNavSections, isNavItemActive, type NavItem } from "./navItems";

interface DashboardNavProps {
  isLeagueMode?: boolean;
  /** Platform (system) admin — shows the /admin moderation hub entry. */
  isPlatformAdmin?: boolean;
  /** Icon-only rail. Labels move into tooltips; group titles become rules. */
  collapsed?: boolean;
}

/**
 * Desktop rail: the sectioned list of destinations. Selection is a step of
 * grey and a heavier label (theme MuiListItemButton) — the rail carries no
 * colour of its own so the content pane is the only thing that does.
 */
export default function DashboardNav({
  isLeagueMode = false,
  isPlatformAdmin = false,
  collapsed = false,
}: DashboardNavProps) {
  const pathname = usePathname();
  // The shell always renders inside LeagueProvider (app/(dashboard)/layout.tsx).
  const { currentLeague } = useLeague();

  const sections = getNavSections({ isLeagueMode, isPlatformAdmin, currentLeague });

  const renderItem = (item: NavItem) => {
    const active = isNavItemActive(pathname, item);
    const button = (
      <ListItemButton
        component={Link}
        href={item.path}
        selected={active}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        sx={collapsed ? { justifyContent: "center", px: 0, minWidth: 40 } : undefined}
      >
        <ListItemIcon sx={collapsed ? { minWidth: 0 } : undefined}>{item.icon}</ListItemIcon>
        {collapsed ? null : <ListItemText primary={item.label} />}
      </ListItemButton>
    );
    return (
      <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
        {collapsed ? (
          <Tooltip title={item.label} placement="right" arrow>
            {button}
          </Tooltip>
        ) : (
          button
        )}
      </ListItem>
    );
  };

  return (
    <Box component="nav" aria-label="Sections" sx={{ px: 1, py: 0.5 }}>
      {sections.map((section, index) => (
        <Box key={section.title ?? `section-${index}`}>
          {section.title ? (
            collapsed ? (
              <Box
                role="presentation"
                sx={{ height: "1px", bgcolor: "divider", mx: 1, my: 1 }}
              />
            ) : (
              <Typography
                variant="eyebrow"
                component="h2"
                sx={{ display: "block", px: 1.25, pt: 2, pb: 0.75, color: "text.secondary" }}
              >
                {section.title}
              </Typography>
            )
          ) : null}
          <List disablePadding>{section.items.map(renderItem)}</List>
        </Box>
      ))}
    </Box>
  );
}
