"use client";

import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Badge,
  Box,
  Chip,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ForumIcon from "@mui/icons-material/Forum";
import ThreadDetail from "./ThreadDetail";
import { EmptyState } from "@/components/ui/EmptyState";
import type { LeagueThreadView } from "@/types/league-threads";

type ThreadInboxProps = {
  threads: LeagueThreadView[];
  /** The team this viewer acts for; null for the association-side inbox. */
  viewerTeamId: string | null;
  /** Association admins may resolve and close threads. */
  canModerate: boolean;
};

type TabKey = "open" | "instructions" | "requests" | "closed";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "open", label: "Open" },
  { key: "instructions", label: "Instructions" },
  { key: "requests", label: "Requests" },
  { key: "closed", label: "Resolved & closed" },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export default function ThreadInbox({
  threads,
  viewerTeamId,
  canModerate,
}: ThreadInboxProps) {
  const [tab, setTab] = useState<TabKey>("open");

  const filtered = useMemo(() => {
    switch (tab) {
      case "open":
        return threads.filter((t) => t.status === "OPEN");
      case "instructions":
        return threads.filter((t) => t.kind === "INSTRUCTION");
      case "requests":
        return threads.filter((t) => t.kind === "TEAM_REQUEST");
      case "closed":
        return threads.filter((t) => t.status !== "OPEN");
    }
  }, [threads, tab]);

  // Work this viewer still owes — drives the badge on the Open tab.
  const pendingForViewer = useMemo(
    () => threads.filter((t) => t.viewerResponsePending).length,
    [threads]
  );

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, value: TabKey) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        {TABS.map((entry) => (
          <Tab
            key={entry.key}
            value={entry.key}
            sx={{ minHeight: 48 }}
            label={
              entry.key === "open" && pendingForViewer > 0 ? (
                <Badge badgeContent={pendingForViewer} color="error" sx={{ pr: 1.5 }}>
                  {entry.label}
                </Badge>
              ) : (
                entry.label
              )
            }
          />
        ))}
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ForumIcon />}
          title="Nothing here yet"
          description={
            tab === "open"
              ? "Open instructions and requests will appear here."
              : "No threads match this filter."
          }
        />
      ) : (
        <Stack spacing={1}>
          {filtered.map((thread) => (
            <Accordion key={thread.id} disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 56 }}>
                <Box sx={{ pr: 2, width: "100%" }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {thread.subject}
                    </Typography>
                    {thread.viewerResponsePending && (
                      <Chip size="small" color="error" label="Response needed" />
                    )}
                    {thread.priority === "URGENT" && (
                      <Chip size="small" color="error" variant="outlined" label="Urgent" />
                    )}
                    {thread.status !== "OPEN" && (
                      <Chip size="small" color="success" label={thread.status} />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {thread.kind === "INSTRUCTION"
                      ? thread.requiresResponse
                        ? `${thread.respondedCount}/${thread.targetCount} responded`
                        : `Sent to ${thread.targetCount} team${thread.targetCount === 1 ? "" : "s"}`
                      : `Raised by ${thread.originTeam?.name ?? "a team"}`}
                    {" · "}
                    {dateFormatter.format(new Date(thread.createdAt))}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <ThreadDetail
                  thread={thread}
                  viewerTeamId={viewerTeamId}
                  canModerate={canModerate}
                />
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}
    </Box>
  );
}
