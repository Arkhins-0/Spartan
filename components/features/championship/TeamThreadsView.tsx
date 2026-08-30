"use client";

import { useState } from "react";
import { Box, Button, MenuItem, Select, Stack, Typography } from "@mui/material";
import AddCommentIcon from "@mui/icons-material/AddComment";
import ThreadInbox from "./ThreadInbox";
import TeamRequestForm from "./TeamRequestForm";
import type { LeagueThreadView } from "@/types/league-threads";

type TeamOption = { id: string; name: string; leagueId: string };

type TeamThreadsViewProps = {
  teams: TeamOption[];
  /** Threads keyed by team id — the viewer may administer more than one team. */
  threadsByTeam: Record<string, LeagueThreadView[]>;
};

/** Team-side inbox: instructions received, plus requests this team raised. */
export default function TeamThreadsView({ teams, threadsByTeam }: TeamThreadsViewProps) {
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id ?? "");
  const [requestOpen, setRequestOpen] = useState(false);

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? teams[0];
  const threads = threadsByTeam[selectedTeamId] ?? [];

  if (!selectedTeam) {
    return (
      <Typography color="text.secondary">
        You are not an administrator of any team in an association.
      </Typography>
    );
  }

  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 3 }}
        alignItems={{ sm: "center" }}
      >
        {teams.length > 1 && (
          <Box sx={{ minWidth: 220 }}>
            <Select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              size="small"
              fullWidth
            >
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}
        <Button
          variant="contained"
          startIcon={<AddCommentIcon />}
          onClick={() => setRequestOpen(true)}
          sx={{ minHeight: 44 }}
        >
          Raise a request
        </Button>
      </Stack>

      <ThreadInbox
        threads={threads}
        viewerTeamId={selectedTeam.id}
        canModerate={false}
      />

      <TeamRequestForm
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        leagueId={selectedTeam.leagueId}
        teamId={selectedTeam.id}
      />
    </>
  );
}
