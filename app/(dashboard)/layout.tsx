import { ReactNode } from "react";
import { requireAuth, requireUserIdFromSession, isPlatformAdmin } from "@/lib/auth/session";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { getUserMode } from "@/lib/utils/league-mode";
import { LeagueProvider } from "@/components/providers/LeagueProvider";
import { KeyboardShortcutsProvider } from "@/components/features/navigation/KeyboardShortcutsProvider";
import DashboardShell from "@/components/features/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Require authentication for all dashboard routes
  const session = await requireAuth();
  const userId = await requireUserIdFromSession(session);

  // Get user mode for adaptive navigation
  const [userMode, platformAdmin] = await Promise.all([
    getUserMode(userId),
    isPlatformAdmin(userId),
  ]);

  return (
    <LeagueProvider initialData={userMode}>
      <KeyboardShortcutsProvider>
        <DashboardShell
          isLeagueMode={userMode.isLeagueMode}
          isPlatformAdmin={platformAdmin}
          viewer={{ name: session.user.name ?? null, email: session.user.email }}
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </DashboardShell>
      </KeyboardShortcutsProvider>
    </LeagueProvider>
  );
}
