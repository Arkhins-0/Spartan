import { Alert } from "@mui/material";
import { redirect } from "next/navigation";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import { LinkButton } from "@/components/ui/NextLinkComposites";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlayLibrary } from "@/components/features/practice-planner/PlayLibrary";
import { getPlayLibraryContext } from "@/lib/actions/practice-session-queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Play Library | Spartan",
  description: "Browse and manage your saved plays",
};

export default async function PlayLibraryPage() {
  const context = await getPlayLibraryContext();

  if (!context) {
    redirect("/dashboard");
  }

  if (!context.isAdmin) {
    return (
      <PageContainer>
        <PageHeader
          icon={<LibraryBooksIcon />}
          title="Play Library"
          subtitle="Admins only"
          actions={
            <LinkButton href="/practice-planner" startIcon={<ArrowBackIcon />} variant="outlined">
              Back to practice planner
            </LinkButton>
          }
        />
        <Alert severity="warning">
          Only team admins can access the play library.
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon={<LibraryBooksIcon />}
        title="Play Library"
        subtitle="Reusable plays and drills for practice sessions"
        actions={
          <>
            <LinkButton href="/practice-planner" startIcon={<ArrowBackIcon />} variant="outlined">
              Practice planner
            </LinkButton>
            <LinkButton
              href="/practice-planner/library/new"
              startIcon={<AddIcon />}
              variant="contained"
            >
              New play
            </LinkButton>
          </>
        }
      />
      <PlayLibrary teamId={context.teamId} mode="manage" showHeader={false} />
    </PageContainer>
  );
}
