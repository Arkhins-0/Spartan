"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BlockIcon from "@mui/icons-material/Block";
import { postThreadEntry, resolveThread, closeThread } from "@/lib/actions/league-threads";
import { useToast } from "@/components/ui/Toast";
import type { LeagueThreadView } from "@/types/league-threads";

const PRIORITY_COLORS = {
  LOW: "default",
  NORMAL: "info",
  HIGH: "warning",
  URGENT: "error",
} as const;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

type ThreadDetailProps = {
  thread: LeagueThreadView;
  /**
   * The team this viewer is acting for, or null when they are acting as the
   * association. Drives who a reply is attributed to.
   */
  viewerTeamId: string | null;
  /** Server-computed: may this viewer resolve/close the thread? */
  canModerate: boolean;
};

export default function ThreadDetail({
  thread,
  viewerTeamId,
  canModerate,
}: ThreadDetailProps) {
  const { showSuccess, showError } = useToast();
  const [reply, setReply] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOpen = thread.status === "OPEN";

  const handleReply = async () => {
    if (!reply.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await postThreadEntry({
        threadId: thread.id,
        body: reply,
        actorTeamId: viewerTeamId ?? undefined,
      });
      if (result.success) {
        setReply("");
        showSuccess("Reply posted");
      } else {
        showError(result.error);
      }
    } catch {
      showError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransition = async (action: "resolve" | "close") => {
    setIsSubmitting(true);
    try {
      const result =
        action === "resolve"
          ? await resolveThread({ threadId: thread.id })
          : await closeThread({ threadId: thread.id });
      if (result.success) {
        showSuccess(action === "resolve" ? "Thread resolved" : "Thread closed");
      } else {
        showError(result.error);
      }
    } catch {
      showError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      {/* Original message */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
          <Chip
            size="small"
            label={thread.kind === "INSTRUCTION" ? "Instruction" : "Team request"}
            color={thread.kind === "INSTRUCTION" ? "primary" : "secondary"}
            variant="outlined"
          />
          <Chip
            size="small"
            label={thread.priority}
            color={PRIORITY_COLORS[thread.priority]}
            variant="outlined"
          />
          <Chip
            size="small"
            label={thread.status}
            color={thread.status === "OPEN" ? "default" : "success"}
          />
          {thread.originTeam && (
            <Chip size="small" variant="outlined" label={thread.originTeam.name} />
          )}
        </Stack>
        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
          {thread.body}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {thread.createdBy.name} · {dateFormatter.format(new Date(thread.createdAt))}
        </Typography>
      </Box>

      {/* Per-team response tracking (instructions only) */}
      {thread.kind === "INSTRUCTION" && thread.targets.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Divider sx={{ mb: 1.5 }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {thread.requiresResponse
              ? `Responses — ${thread.respondedCount} of ${thread.targetCount}`
              : `Sent to ${thread.targetCount} team${thread.targetCount === 1 ? "" : "s"}`}
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {thread.targets.map((target) => (
              <Chip
                key={target.id}
                size="small"
                variant="outlined"
                color={target.status === "ACKNOWLEDGED" ? "success" : "default"}
                label={target.team.name}
                icon={target.status === "ACKNOWLEDGED" ? <CheckCircleIcon /> : undefined}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Reply timeline */}
      {thread.entries.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Divider sx={{ mb: 1.5 }} />
          <Stack spacing={1.5}>
            {thread.entries.map((entry) => (
              <Box key={entry.id}>
                {entry.kind === "MESSAGE" ? (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {entry.actorTeam ? entry.actorTeam.name : "Association"} ·{" "}
                      {entry.actorName} · {dateFormatter.format(new Date(entry.createdAt))}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {entry.body}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    {entry.kind === "RESOLVE" ? "Resolved" : "Closed"} by {entry.actorName} ·{" "}
                    {dateFormatter.format(new Date(entry.createdAt))}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Actions */}
      {isOpen && (
        <>
          <Divider sx={{ mb: 2 }} />
          <TextField
            label={thread.viewerResponsePending ? "Your response (required)" : "Reply"}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 5000 } }}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              onClick={handleReply}
              disabled={isSubmitting || !reply.trim()}
              sx={{ minHeight: 44 }}
            >
              {isSubmitting ? "Sending..." : "Post reply"}
            </Button>
            {canModerate && (
              <>
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleTransition("resolve")}
                  disabled={isSubmitting}
                  sx={{ minHeight: 44 }}
                >
                  Resolve
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<BlockIcon />}
                  onClick={() => handleTransition("close")}
                  disabled={isSubmitting}
                  sx={{ minHeight: 44 }}
                >
                  Close
                </Button>
              </>
            )}
          </Stack>
        </>
      )}
    </Box>
  );
}
