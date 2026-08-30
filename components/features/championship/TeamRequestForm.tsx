"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { createTeamRequest } from "@/lib/actions/league-threads";
import { useToast } from "@/components/ui/Toast";

type TeamRequestFormProps = {
  open: boolean;
  onClose: () => void;
  leagueId: string;
  teamId: string;
};

export default function TeamRequestForm({
  open,
  onClose,
  leagueId,
  teamId,
}: TeamRequestFormProps) {
  const { showSuccess, showError } = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setSubject("");
    setBody("");
    setPriority("NORMAL");
    onClose();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await createTeamRequest({
        leagueId,
        teamId,
        subject,
        body,
        priority,
      });

      if (result.success) {
        showSuccess("Request sent to the organisers");
        handleClose();
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Raise a request</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            fullWidth
            autoFocus
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />

          <TextField
            label="What do you need?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            multiline
            minRows={4}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 5000 } }}
          />

          <FormControl fullWidth>
            <InputLabel id="request-priority-label">Priority</InputLabel>
            <Select
              labelId="request-priority-label"
              label="Priority"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as "LOW" | "NORMAL" | "HIGH" | "URGENT")
              }
            >
              <MenuItem value="LOW">Low</MenuItem>
              <MenuItem value="NORMAL">Normal</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="URGENT">Urgent</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || !subject.trim() || !body.trim()}
        >
          {isSubmitting ? "Sending..." : "Send request"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
