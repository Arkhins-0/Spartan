import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ManageAccounts as AccountIcon } from "@mui/icons-material";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import AccountSettings from "@/components/features/account/AccountSettings";

export const metadata: Metadata = {
  title: "Account Settings",
};

export default async function AccountPage() {
  const userId = await requireUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      emailVerified: true,
      createdAt: true,
      teamMembers: { select: { role: true }, where: { role: "ADMIN" } },
    },
  });

  if (!user) {
    // Session outlived the account (e.g. deleted elsewhere)
    redirect("/login");
  }

  const memberSince = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(user.createdAt);

  return (
    <PageContainer maxWidth="md">
      <PageHeader
        icon={<AccountIcon />}
        title="Account"
        subtitle={`${user.email} · member since ${memberSince}`}
      />
      <AccountSettings
        email={user.email}
        name={user.name}
        emailVerified={user.emailVerified !== null}
        createdAt={user.createdAt.toISOString()}
        adminTeamCount={user.teamMembers.length}
      />
    </PageContainer>
  );
}
