import { Alert } from "@mui/material";
import { redirect } from "next/navigation";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SportsHockeyIcon from "@mui/icons-material/SportsHockey";
import { LinkButton } from "@/components/ui/NextLinkComposites";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPlayLibraryContext } from "@/lib/actions/practice-session-queries";
import { PlayEditorWrapper } from "../PlayEditorWrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Play | Spartan",
  description: "Create a new play for your library",
};

export default async function NewPlayPage() {
  const context = await getPlayLibraryContext();

  if (!context) {
    redirect("/dashboard");
  }

  if (!context.isAdmin) {
    return (
      <PageContainer>
        <PageHeader
          icon={<SportsHockeyIcon />}
          title="New play"
          subtitle="Admins only"
          actions={
            <LinkButton
              href="/practice-planner/library"
              startIcon={<ArrowBackIcon />}
              variant="outlined"
            >
              Back to play library
            </LinkButton>
          }
        />
        <Alert severity="warning">
          Only team admins can create plays.
        </Alert>
      </PageContainer>
    );
  }

  // PlayEditor owns the page header (title, save state, actions).
  return (
    <PageContainer>
      <PlayEditorWrapper teamId={context.teamId} />
    </PageContainer>
  );
}
