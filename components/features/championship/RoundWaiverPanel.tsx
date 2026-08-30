"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import { useToast } from "@/components/ui/Toast";
import {
  acceptRoundWaiver,
  upsertRoundWaiver,
  type RoundWaiverView,
} from "@/lib/actions/round-waivers";

export interface RoundWaiverPanelProps {
  roundId: string;
  waiver: RoundWaiverView | null;
  canManage: boolean;
}

/**
 * The waiver for a race weekend.
 *
 * Organizers draft and publish it; everyone else reads it and accepts. Editing
 * published wording bumps the version, which is why the editor says so plainly:
 * an unannounced re-scope of what people already agreed to would be the worst
 * possible behaviour here.
 */
export default function RoundWaiverPanel({
  roundId,
  waiver,
  canManage,
}: RoundWaiverPanelProps) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(waiver?.title ?? "");
  const [body, setBody] = useState(waiver?.body ?? "");
  const [publish, setPublish] = useState(waiver?.published ?? false);

  function handleSave() {
    startTransition(async () => {
      const result = await upsertRoundWaiver({ roundId, title, body, publish });
      if (result.success) {
        showSuccess(
          waiver && waiver.version !== result.data.version
            ? `Saved as version ${result.data.version}. Everyone must accept again.`
            : "Waiver saved.",
        );
        router.refresh();
      } else {
        showError(result.error);
      }
    });
  }

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptRoundWaiver(roundId);
      if (result.success) {
        showSuccess("Waiver accepted.");
        router.refresh();
      } else {
        showError(result.error);
      }
    });
  }

  return (
    <Stack spacing={3}>
      {waiver?.published ? (
        <Card variant="outlined" sx={{ p: 2 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Typography variant="h6" component="h3">
              {waiver.title}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" variant="outlined" label={`Version ${waiver.version}`} />
              {waiver.acceptedByViewer ? (
                <Chip size="small" color="success" label="You have accepted" />
              ) : null}
              {waiver.acceptanceCount !== null ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${waiver.acceptanceCount} accepted`}
                />
              ) : null}
            </Stack>
          </Stack>

          <Typography
            variant="body2"
            component="div"
            sx={{ mt: 2, whiteSpace: "pre-wrap" }}
          >
            {waiver.body}
          </Typography>

          {!waiver.acceptedByViewer ? (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                disabled={pending}
                sx={{ minHeight: 44 }}
                onClick={handleAccept}
              >
                I accept
              </Button>
            </Box>
          ) : null}
        </Card>
      ) : !canManage ? (
        <Typography color="text.secondary">
          There is no waiver published for this weekend.
        </Typography>
      ) : null}

      {canManage ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" component="h3" gutterBottom>
            {waiver ? "Edit the waiver" : "Draft a waiver"}
          </Typography>

          {waiver?.published ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Changing published wording publishes a new version. Everyone who
              already accepted must accept again before they can claim a shift or
              confirm an entry.
            </Alert>
          ) : null}

          <Stack spacing={2}>
            <TextField
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              fullWidth
            />
            <TextField
              label="Waiver text"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              multiline
              minRows={6}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={publish}
                  disabled={waiver?.published}
                  onChange={(event) => setPublish(event.target.checked)}
                />
              }
              label={waiver?.published ? "Published" : "Publish now"}
            />
          </Stack>

          <Button
            variant="contained"
            sx={{ mt: 2, minHeight: 44 }}
            disabled={pending || !title.trim() || !body.trim()}
            onClick={handleSave}
          >
            Save
          </Button>
        </Paper>
      ) : null}
    </Stack>
  );
}
