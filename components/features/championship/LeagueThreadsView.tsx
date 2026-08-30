"use client";

import { useState } from "react";
import { Box, Button } from "@mui/material";
import CampaignIcon from "@mui/icons-material/Campaign";
import ThreadInbox from "./ThreadInbox";
import InstructionComposer from "./InstructionComposer";
import type { LeagueThreadView } from "@/types/league-threads";

type LeagueThreadsViewProps = {
  leagueId: string;
  threads: LeagueThreadView[];
  teams: Array<{ id: string; name: string; divisionId: string | null }>;
  divisions: Array<{ id: string; name: string }>;
};

/** Association-side operations inbox: issue instructions, handle team requests. */
export default function LeagueThreadsView({
  leagueId,
  threads,
  teams,
  divisions,
}: LeagueThreadsViewProps) {
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<CampaignIcon />}
          onClick={() => setComposerOpen(true)}
          sx={{ minHeight: 44 }}
        >
          Issue instruction
        </Button>
      </Box>

      <ThreadInbox threads={threads} viewerTeamId={null} canModerate />

      <InstructionComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        leagueId={leagueId}
        teams={teams}
        divisions={divisions}
      />
    </>
  );
}
