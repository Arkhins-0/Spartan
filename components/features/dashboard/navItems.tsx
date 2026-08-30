import type { ReactNode } from "react";
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
  Settings as SettingsIcon,
  Groups as GroupsIcon,
  Assessment as AnalyticsIcon,
  Description as ReportsIcon,
  Forum as ForumIcon,
  Place as PlaceIcon,
  Storefront as StorefrontIcon,
  DateRange as DateRangeIcon,
  HowToReg as HowToRegIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  ManageAccounts as ManageAccountsIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Inventory2 as GearIcon,
  Diversity3 as WorkforceIcon,
  EmojiEvents as LeagueIcon,
  Assignment as OperationsIcon,
  EventAvailable as VenueReservationsIcon,
  Flag as FlagIcon,
  Leaderboard as StandingsIcon,
  Folder as DocumentsIcon,
  Newspaper as NewsIcon,
  Mail as InvitationsIcon,
} from "@mui/icons-material";

export interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

/** A titled run of destinations. `title: null` renders the group unlabelled. */
export interface NavSection {
  title: string | null;
  items: NavItem[];
}

export interface NavContext {
  isLeagueMode: boolean;
  isPlatformAdmin: boolean;
  currentLeague: { id: string } | null;
}

/**
 * The ONE list of dashboard destinations. The desktop rail and the mobile
 * chip row both render from it, so they can never disagree about what exists
 * or where it goes. Grouped by what the person is doing rather than by data
 * model — league mode reaches two dozen entries, which is unreadable flat.
 */
export function getNavSections({
  isLeagueMode,
  isPlatformAdmin,
  currentLeague,
}: NavContext): NavSection[] {
  const adminItems: NavItem[] = isPlatformAdmin
    ? [{ label: "Admin", path: "/admin", icon: <AdminPanelSettingsIcon /> }]
    : [];

  if (!isLeagueMode) {
    return [
      {
        title: null,
        items: [
          { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
          { label: "Roster", path: "/roster", icon: <PeopleIcon /> },
          { label: "Calendar", path: "/calendar", icon: <CalendarIcon /> },
          { label: "Seasons", path: "/seasons", icon: <DateRangeIcon /> },
        ],
      },
      {
        title: "Programs",
        items: [
          { label: "Signup Events", path: "/signup-events", icon: <HowToRegIcon /> },
          { label: "My Registrations", path: "/my-registrations", icon: <ConfirmationNumberIcon /> },
        ],
      },
      {
        title: "Facilities",
        items: [
          { label: "Venues", path: "/venues", icon: <PlaceIcon /> },
          { label: "Venue Admin", path: "/venue-admin", icon: <StorefrontIcon /> },
        ],
      },
      {
        title: "Association",
        items: [
          // A team admin's own inbox of association instructions and requests.
          { label: "Instructions", path: "/threads", icon: <ForumIcon /> },
          // Entry point into league mode: /league hosts the create-a-league
          // form; without this, every league-scoped surface is unreachable.
          { label: "Leagues", path: "/league", icon: <LeagueIcon /> },
        ],
      },
      {
        title: "Manage",
        items: [
          { label: "Team Settings", path: "/settings", icon: <SettingsIcon /> },
          { label: "Account", path: "/account", icon: <ManageAccountsIcon /> },
          ...adminItems,
        ],
      },
    ].filter((section) => section.items.length > 0);
  }

  const leaguePrefix = currentLeague ? `/league/${currentLeague.id}` : "";
  return [
    {
      title: null,
      items: [
        { label: "Dashboard", path: `${leaguePrefix}/dashboard`, icon: <DashboardIcon /> },
        { label: "Teams", path: `${leaguePrefix}/teams`, icon: <GroupsIcon /> },
        { label: "Schedule", path: `${leaguePrefix}/schedule`, icon: <CalendarIcon /> },
        { label: "Rounds", path: `${leaguePrefix}/rounds`, icon: <FlagIcon /> },
        { label: "Standings", path: `${leaguePrefix}/standings`, icon: <StandingsIcon /> },
        { label: "Roster", path: `${leaguePrefix}/roster`, icon: <PeopleIcon /> },
      ],
    },
    {
      title: "Operations",
      items: [
        { label: "Operations", path: `${leaguePrefix}/operations`, icon: <OperationsIcon /> },
        { label: "Gear", path: `${leaguePrefix}/gear`, icon: <GearIcon /> },
        { label: "Workforce", path: `${leaguePrefix}/workforce`, icon: <WorkforceIcon /> },
        {
          label: "Venue Reservations",
          path: `${leaguePrefix}/venue-reservations`,
          icon: <VenueReservationsIcon />,
        },
        ...(currentLeague
          ? [{ label: "Invitations", path: `${leaguePrefix}/invitations`, icon: <InvitationsIcon /> }]
          : []),
      ],
    },
    {
      title: "Communication",
      items: [
        { label: "Messages", path: `${leaguePrefix}/messages`, icon: <ForumIcon /> },
        // Two-way instruction/request threads, distinct from one-way Messages.
        { label: "Instructions", path: `${leaguePrefix}/threads`, icon: <ForumIcon /> },
        { label: "Documents", path: `${leaguePrefix}/documents`, icon: <DocumentsIcon /> },
        { label: "News", path: `${leaguePrefix}/content`, icon: <NewsIcon /> },
      ],
    },
    {
      title: "Programs",
      items: [
        { label: "Signup Events", path: "/signup-events", icon: <HowToRegIcon /> },
        { label: "My Registrations", path: "/my-registrations", icon: <ConfirmationNumberIcon /> },
        { label: "Seasons", path: "/seasons", icon: <DateRangeIcon /> },
      ],
    },
    {
      title: "Facilities",
      items: [
        // League-scoped venues; falls back to the global page without league context
        {
          label: "Venues",
          path: currentLeague ? `${leaguePrefix}/venues` : "/venues",
          icon: <PlaceIcon />,
        },
        { label: "Venue Admin", path: "/venue-admin", icon: <StorefrontIcon /> },
      ],
    },
    {
      title: "Insights",
      items: [
        { label: "Statistics", path: `${leaguePrefix}/statistics`, icon: <AnalyticsIcon /> },
        { label: "Reports", path: `${leaguePrefix}/reports`, icon: <ReportsIcon /> },
      ],
    },
    {
      title: "Manage",
      items: [
        ...(currentLeague
          ? [{ label: "Settings", path: `${leaguePrefix}/settings`, icon: <SettingsIcon /> }]
          : []),
        { label: "Account", path: "/account", icon: <ManageAccountsIcon /> },
        ...adminItems,
      ],
    },
  ].filter((section) => section.items.length > 0);
}

/** Active-route test shared by the rail and the chip row. */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.path === "/dashboard" && pathname === "/") return true;
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}
