"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import VerifiedIcon from "@mui/icons-material/Verified";

import {
  VOLUNTEER_CREDENTIAL_KINDS,
  VOLUNTEER_CREDENTIAL_KIND_LABELS,
} from "@/lib/utils/validation";
import {
  deleteVolunteerCredential,
  recordVolunteerCredential,
  verifyVolunteerCredential,
  type VolunteerCredentialView,
} from "@/lib/actions/volunteer-credentials";

type Kind = (typeof VOLUNTEER_CREDENTIAL_KINDS)[number];

export interface CredentialManagerProps {
  leagueId: string;
  credentials: VolunteerCredentialView[];
  /** Association members a credential can be recorded against. Organizers only. */
  people?: Array<{ id: string; name: string }>;
  isOrganizer: boolean;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function formatDate(value: Date | null): string {
  return value ? dateFormatter.format(new Date(value)) : "—";
}

/**
 * Marshal grades, licences, first aid, and training.
 *
 * References only — a number and an expiry, never an uploaded certificate. A
 * volunteer sees their own; an organizer sees everyone's, because that is what
 * staffing a post safely requires.
 */
export default function CredentialManager({
  leagueId,
  credentials,
  people = [],
  isOrganizer,
}: CredentialManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState("");
  const [kind, setKind] = useState<Kind>("MARSHAL_GRADE");
  const [label, setLabel] = useState("");
  const [reference, setReference] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) router.refresh();
      else setError(result.error ?? "That action could not be completed.");
    });
  }

  function handleRecord() {
    run(async () => {
      const result = await recordVolunteerCredential({
        leagueId,
        userId,
        kind,
        label,
        ...(reference ? { reference } : {}),
        ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
      });
      if (result.success) {
        setLabel("");
        setReference("");
        setExpiresAt("");
      }
      return result;
    });
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      {credentials.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          {isOrganizer
            ? "No credentials recorded yet."
            : "You have no recorded qualifications."}
        </Typography>
      ) : (
        <TableContainer component={Card} variant="outlined" sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {isOrganizer && <TableCell sx={{ fontWeight: 700 }}>Person</TableCell>}
                <TableCell sx={{ fontWeight: 700 }}>Kind</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Grade</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Expires</TableCell>
                {isOrganizer && <TableCell />}
              </TableRow>
            </TableHead>
            <TableBody>
              {credentials.map((credential) => (
                <TableRow key={credential.id} hover>
                  {isOrganizer && <TableCell>{credential.holderName}</TableCell>}
                  <TableCell>
                    {VOLUNTEER_CREDENTIAL_KIND_LABELS[credential.kind]}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2">{credential.label}</Typography>
                      {credential.verified ? (
                        <Chip
                          size="small"
                          color="success"
                          variant="outlined"
                          icon={<VerifiedIcon />}
                          label="Sighted"
                        />
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell>{credential.reference ?? "—"}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2">
                        {formatDate(credential.expiresAt)}
                      </Typography>
                      {credential.expired ? (
                        // Advisory, not a revocation: it blocks a new self-claim
                        // and warns here, and never stands anybody down.
                        <Chip size="small" color="warning" label="Lapsed" />
                      ) : null}
                    </Stack>
                  </TableCell>
                  {isOrganizer && (
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {!credential.verified ? (
                          <Button
                            size="small"
                            disabled={pending}
                            sx={{ minHeight: 44 }}
                            onClick={() =>
                              run(() => verifyVolunteerCredential(credential.id))
                            }
                          >
                            Sighted
                          </Button>
                        ) : null}
                        <IconButton
                          size="small"
                          aria-label={`Remove ${credential.label}`}
                          disabled={pending}
                          onClick={() => run(() => deleteVolunteerCredential(credential.id))}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {isOrganizer && people.length > 0 ? (
        <Card variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" component="h3" gutterBottom>
            Record a qualification
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              select
              label="Person"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              fullWidth
            >
              {people.map((person) => (
                <MenuItem key={person.id} value={person.id}>
                  {person.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as Kind)}
              fullWidth
            >
              {VOLUNTEER_CREDENTIAL_KINDS.map((option) => (
                <MenuItem key={option} value={option}>
                  {VOLUNTEER_CREDENTIAL_KIND_LABELS[option]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Grade or qualification"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              helperText="As the issuing body names it, e.g. &quot;Post Chief&quot;."
              fullWidth
            />
            <TextField
              label="Reference number"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              helperText="The number only. Never upload the certificate."
              fullWidth
            />
            <TextField
              label="Expires"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="Leave blank if it does not expire."
              fullWidth
            />
          </Box>
          <Button
            variant="contained"
            sx={{ mt: 2, minHeight: 44 }}
            disabled={pending || !userId || !label.trim()}
            onClick={handleRecord}
          >
            Record
          </Button>
        </Card>
      ) : null}
    </Stack>
  );
}
