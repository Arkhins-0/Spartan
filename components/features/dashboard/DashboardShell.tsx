"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
  Logout as LogoutIcon,
  ManageAccounts as AccountIcon,
} from "@mui/icons-material";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LeagueContextSwitcher from "@/components/features/navigation/LeagueContextSwitcher";
import DashboardNav from "@/components/features/dashboard/DashboardNav";
import MobileNavigation from "@/components/features/navigation/MobileNavigation";
import BreadcrumbNav from "@/components/features/navigation/BreadcrumbNav";
import KeyboardShortcutsHelp from "@/components/features/navigation/KeyboardShortcutsHelp";
import { logout } from "@/lib/actions/logout";
import { useStoredFlag } from "@/lib/hooks/useStoredFlag";

export interface DashboardViewer {
  name: string | null;
  email: string;
}

interface DashboardShellProps {
  isLeagueMode: boolean;
  /** Platform (system) admin — surfaces the /admin nav entry. */
  isPlatformAdmin?: boolean;
  viewer: DashboardViewer;
  children: ReactNode;
}

const RAIL_WIDTH = 224;
const RAIL_WIDTH_XL = 248;
const RAIL_COLLAPSED = 60;
const COLLAPSE_KEY = "ol-sidebar-collapsed";

function initialsFor(viewer: DashboardViewer): string {
  const source = viewer.name?.trim() || viewer.email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * The console shell.
 *
 * Desktop: a floating rail (a card inset from the page edge, so the page
 * colour shows all the way around it — that inset is what separates the
 * navigation from the work without a hard full-height rule) beside a content
 * pane. The document does not scroll; each pane scrolls on its own, and the
 * rail collapses to an icon strip rather than vanishing, because a pane that
 * vanishes needs a button somewhere else to bring it back.
 *
 * Phone: a top bar (logo, league switcher, account) over a horizontally
 * scrolling chip row of every destination, and one normally scrolling
 * document beneath — the same list as the rail, so nothing is hidden behind
 * a "more" menu.
 */
export default function DashboardShell({
  isLeagueMode,
  isPlatformAdmin = false,
  viewer,
  children,
}: DashboardShellProps) {
  // Persisted per browser; the server snapshot is "expanded" so markup matches.
  const [collapsed, setCollapsed] = useStoredFlag(COLLAPSE_KEY);
  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null);

  const toggleCollapsed = () => setCollapsed(!collapsed);

  const handleLogout = async () => {
    setAccountAnchor(null);
    await logout();
  };

  const accountMenu = (
    <Menu
      anchorEl={accountAnchor}
      open={Boolean(accountAnchor)}
      onClose={() => setAccountAnchor(null)}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Box sx={{ px: 1.5, py: 1, maxWidth: 240 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {viewer.name ?? viewer.email}
        </Typography>
        {viewer.name ? (
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {viewer.email}
          </Typography>
        ) : null}
      </Box>
      <Divider sx={{ my: 0.5 }} />
      <MenuItem component={Link} href="/account" onClick={() => setAccountAnchor(null)}>
        <ListItemIcon>
          <AccountIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Account</ListItemText>
      </MenuItem>
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Log out</ListItemText>
      </MenuItem>
    </Menu>
  );

  return (
    <Box
      data-dashboard-shell
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: { xs: "block", md: "flex" },
        gap: { md: 1 },
        p: { md: 1 },
        height: { md: "100vh" },
        overflow: { md: "hidden" },
      }}
    >
      {/* ---- Phone: top bar + chip row, sticky as one block ---- */}
      <Box
        component="header"
        sx={{
          display: { xs: "block", md: "none" },
          position: "sticky",
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            minHeight: 56,
            bgcolor: "background.paper",
            borderBottom: "1px solid var(--sp-border)",
          }}
        >
          <Logo size="medium" href="/dashboard" showText priority sx={{ mr: "auto" }} />
          <LeagueContextSwitcher variant="compact" />
          <ThemeToggle />
          <Tooltip title="Account">
            <IconButton
              size="small"
              aria-label="Account menu"
              aria-haspopup="menu"
              onClick={(event) => setAccountAnchor(event.currentTarget)}
            >
              <Avatar sx={{ width: 28, height: 28, fontSize: "0.6875rem" }}>
                {initialsFor(viewer)}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>
        <MobileNavigation isLeagueMode={isLeagueMode} isPlatformAdmin={isPlatformAdmin} />
      </Box>

      {/* ---- Desktop: the rail ---- */}
      <Box
        component="aside"
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          flexShrink: 0,
          width: collapsed ? RAIL_COLLAPSED : { md: RAIL_WIDTH, xl: RAIL_WIDTH_XL },
          transition: "width 0.2s ease",
          bgcolor: "background.paper",
          border: "1px solid var(--sp-border)",
          borderRadius: 2,
          overflow: "hidden",
          "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            px: collapsed ? 0 : 1.5,
            minHeight: 56,
            borderBottom: "1px solid var(--sp-border)",
          }}
        >
          {collapsed ? null : <Logo size="small" href="/dashboard" showText priority />}
          <Tooltip title={collapsed ? "Expand navigation" : "Collapse navigation"} placement="right">
            <IconButton
              size="small"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
              aria-expanded={!collapsed}
            >
              {collapsed ? <ExpandIcon fontSize="small" /> : <CollapseIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

        {collapsed ? null : (
          <Box sx={{ px: 1.5, pt: 1.5, "&:empty": { display: "none" } }}>
            <LeagueContextSwitcher />
          </Box>
        )}

        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}>
          <DashboardNav
            isLeagueMode={isLeagueMode}
            isPlatformAdmin={isPlatformAdmin}
            collapsed={collapsed}
          />
        </Box>

        {/* Foot: who you are, the scheme, and the way out. */}
        <Box
          sx={{
            borderTop: "1px solid var(--sp-border)",
            p: 1,
            display: "flex",
            alignItems: "center",
            flexDirection: collapsed ? "column" : "row",
            gap: 0.5,
          }}
        >
          <Tooltip title={collapsed ? viewer.name ?? viewer.email : ""} placement="right">
            <IconButton
              size="small"
              aria-label="Account menu"
              aria-haspopup="menu"
              onClick={(event) => setAccountAnchor(event.currentTarget)}
              sx={{
                flex: collapsed ? "0 0 auto" : 1,
                justifyContent: "flex-start",
                gap: 1,
                px: collapsed ? 0 : 0.75,
                minWidth: 0,
                borderRadius: 1.5,
              }}
            >
              <Avatar sx={{ width: 28, height: 28, fontSize: "0.6875rem" }}>
                {initialsFor(viewer)}
              </Avatar>
              {collapsed ? null : (
                <Box sx={{ minWidth: 0, textAlign: "left" }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, lineHeight: 1.2, color: "text.primary" }}
                    noWrap
                  >
                    {viewer.name ?? viewer.email}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", lineHeight: 1.2 }}
                    noWrap
                  >
                    {isPlatformAdmin ? "Platform admin" : isLeagueMode ? "League" : "Team"}
                  </Typography>
                </Box>
              )}
            </IconButton>
          </Tooltip>
          <ThemeToggle />
        </Box>
      </Box>

      {/* ---- Content pane ---- */}
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.default",
          overflowY: { md: "auto" },
          overscrollBehavior: "contain",
          outline: "none",
        }}
      >
        <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, pt: { xs: 1, md: 1.5 }, "&:empty": { display: "none" } }}>
          <BreadcrumbNav sx={{ py: 0 }} />
        </Box>
        {children}
      </Box>

      {accountMenu}
      <KeyboardShortcutsHelp />
    </Box>
  );
}
