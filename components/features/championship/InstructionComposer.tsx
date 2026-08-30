"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { createInstruction } from "@/lib/actions/league-threads";
import { useToast } from "@/components/ui/Toast";

type TeamOption = { id: string; name: string; divisionId: string | null };
type DivisionOption = { id: string; name: string };

type InstructionComposerProps = {
  open: boolean;
  onClose: () => void;
  leagueId: string;
  teams: TeamOption[];
  divisions: DivisionOption[];
};

type TargetMode = "entireLeague" | "divisions" | "teams";

export default function InstructionComposer({
  open,
  onClose,
  leagueId,
  teams,
  divisions,
}: InstructionComposerProps) {
  const { showSuccess, showError } = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
  const [requiresResponse, setRequiresResponse] = useState(true);
  const [mode, setMode] = useState<TargetMode>("entireLeague");
  const [divisionIds, setDivisionIds] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live recipient count so the admin sees the blast radius before sending.
  const recipientCount = useMemo(() => {
    if (mode === "entireLeague") return teams.length;
    if (mode === "divisions") {
      return teams.filter((t) => t.divisionId && divisionIds.includes(t.divisionId)).length;
    }
    return teamIds.length;
  }, [mode, teams, divisionIds, teamIds]);

  const reset = () => {
    setSubject("");
    setBody("");
    setPriority("NORMAL");
    setRequiresResponse(true);
    setMode("entireLeague");
    setDivisionIds([]);
    setTeamIds([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await createInstruction({
        leagueId,
        subject,
        body,
        priority,
        requiresResponse,
        targeting: {
          entireLeague: mode === "entireLeague",
          divisionIds: mode === "divisions" ? divisionIds : undefined,
          teamIds: mode === "teams" ? teamIds : undefined,
        },
      });

      if (result.success) {
        showSuccess(
          `Instruction sent to ${result.data.targetedTeamCount} team${
            result.data.targetedTeamCount === 1 ? "" : "s"
          }`
        );
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

  const canSubmit =
    subject.trim().length > 0 && body.trim().length > 0 && recipientCount > 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Issue an instruction</DialogTitle>
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
            label="Instruction"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            multiline
            minRows={4}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 5000 } }}
          />

          <FormControl fullWidth>
            <InputLabel id="instruction-priority-label">Priority</InputLabel>
            <Select
              labelId="instruction-priority-label"
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

          <FormControl>
            <FormLabel id="instruction-target-label">Send to</FormLabel>
            <RadioGroup
              aria-labelledby="instruction-target-label"
              value={mode}
              onChange={(e) => setMode(e.target.value as TargetMode)}
            >
              <FormControlLabel
                value="entireLeague"
                control={<Radio />}
                label="Every team"
              />
              {divisions.length > 0 && (
                <FormControlLabel
                  value="divisions"
                  control={<Radio />}
                  label="Selected classes/divisions"
                />
              )}
              <FormControlLabel value="teams" control={<Radio />} label="Selected teams" />
            </RadioGroup>
          </FormControl>

          {mode === "divisions" && (
            <FormControl fullWidth>
              <InputLabel id="instruction-divisions-label">Classes / divisions</InputLabel>
              <Select
                labelId="instruction-divisions-label"
                label="Classes / divisions"
                multiple
                value={divisionIds}
                onChange={(e) =>
                  setDivisionIds(
                    typeof e.target.value === "string"
                      ? e.target.value.split(",")
                      : e.target.value
                  )
                }
              >
                {divisions.map((division) => (
                  <MenuItem key={division.id} value={division.id}>
                    {division.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {mode === "teams" && (
            <FormControl fullWidth>
              <InputLabel id="instruction-teams-label">Teams</InputLabel>
              <Select
                labelId="instruction-teams-label"
                label="Teams"
                multiple
                value={teamIds}
                onChange={(e) =>
                  setTeamIds(
                    typeof e.target.value === "string"
                      ? e.target.value.split(",")
                      : e.target.value
                  )
                }
              >
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControlLabel
            control={
              <Checkbox
                checked={requiresResponse}
                onChange={(e) => setRequiresResponse(e.target.checked)}
              />
            }
            label="Require each team to respond"
          />

          <Typography variant="body2" color="text.secondary">
            {recipientCount} team{recipientCount === 1 ? "" : "s"} will receive this.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || !canSubmit}
        >
          {isSubmitting ? "Sending..." : "Send instruction"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
