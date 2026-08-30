import { Alert } from "@mui/material";
import { notFound, redirect } from "next/navigation";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SportsHockeyIcon from "@mui/icons-material/SportsHockey";
import { LinkButton } from "@/components/ui/NextLinkComposites";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPlayLibraryContext } from "@/lib/actions/practice-session-queries";
import { getPlayById } from "@/lib/actions/plays";
import { PlayEditorWrapper } from "../../PlayEditorWrapper";
import type { SavedPlay } from "@/types/practice-planner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Play | Spartan",
  description: "Edit a play in your library",
};

interface PageProps {
  params: Promise<{ playId: string }>;
}

export default async function EditPlayPage({ params }: PageProps) {
  const { playId } = await params;
  const context = await getPlayLibraryContext();

  if (!context) {
    redirect("/dashboard");
  }

  if (!context.isAdmin) {
    return (
      <PageContainer>
        <PageHeader
          icon={<SportsHockeyIcon />}
          title="Edit play"
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
          Only team admins can edit plays.
        </Alert>
      </PageContainer>
    );
  }

  const result = await getPlayById({ id: playId, teamId: context.teamId });

  if (!result.success) {
    notFound();
  }

  const play: SavedPlay = {
    id: result.data.id,
    name: result.data.name,
    description: result.data.description ?? "",
    thumbnail: result.data.thumbnail ?? "",
    playData: result.data.playData,
    isTemplate: result.data.isTemplate,
    createdAt: result.data.createdAt,
    updatedAt: result.data.updatedAt,
  };

  // PlayEditor owns the page header (title, save state, actions).
  return (
    <PageContainer>
      <PlayEditorWrapper teamId={context.teamId} play={play} />
    </PageContainer>
  );
}
