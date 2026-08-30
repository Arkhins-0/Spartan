"use client";

import { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  LinearProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
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
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import { uploadToStorage } from "@/lib/storage/client";
import { finalizeDocumentUpload, removeDocument } from "@/lib/actions/documents";
import { DOCUMENT_KINDS, DOCUMENT_KIND_LABELS } from "@/lib/utils/validation";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DocumentKind, DocumentView } from "@/types/documents";

type DocumentsViewProps = {
  leagueId: string;
  documents: DocumentView[];
  /** Teams the viewer may file for; empty when they only file association-wide. */
  teams: Array<{ id: string; name: string }>;
  canUploadForLeague: boolean;
  /** False when no storage provider is configured — uploads must fail visibly. */
  storageEnabled: boolean;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsView({
  leagueId,
  documents,
  teams,
  canUploadForLeague,
  storageEnabled,
}: DocumentsViewProps) {
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<DocumentKind>("OTHER");
  const [teamId, setTeamId] = useState(canUploadForLeague ? "" : teams[0]?.id ?? "");
  const [isUploading, setIsUploading] = useState(false);
  /** Null while the grant is negotiated, then 0–100 while bytes are in flight. */
  const [progress, setProgress] = useState<number | null>(null);

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setTitle("");
    setKind("OTHER");
    setTeamId(canUploadForLeague ? "" : teams[0]?.id ?? "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setProgress(null);
    try {
      // Direct-to-storage upload, then a server action records the row and
      // re-validates the reference, type, and size.
      const uploaded = await uploadToStorage({
        grantUrl: `/api/leagues/${leagueId}/documents/upload`,
        file,
        onProgress: setProgress,
      });

      const result = await finalizeDocumentUpload({
        leagueId,
        teamId: teamId || undefined,
        kind,
        title: title.trim() || file.name,
        key: uploaded.key,
        contentType: file.type,
        sizeBytes: file.size,
      });

      if (result.success) {
        showSuccess("Document filed");
        handleClose();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  };

  const handleRemove = async (documentId: string) => {
    try {
      const result = await removeDocument({ documentId });
      if (result.success) {
        showSuccess("Document removed");
      } else {
        showError(result.error);
      }
    } catch {
      showError("An unexpected error occurred");
    }
  };

  return (
    <>
      {!storageEnabled && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Document storage is not configured. Set <code>STORAGE_PROVIDER</code> (with an
          S3 bucket or a Vercel Blob token) to enable uploads — existing documents remain
          listed.
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          onClick={() => setOpen(true)}
          disabled={!storageEnabled}
          sx={{ minHeight: 44 }}
        >
          Upload document
        </Button>
      </Box>

      {documents.length === 0 ? (
        <EmptyState
          icon={<DescriptionIcon />}
          title="No documents yet"
          description="Entry forms, scrutineering sheets, medical certificates, and results sheets appear here."
        />
      ) : (
        <TableContainer>
          <Table aria-label="Documents" sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>Document</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Team</TableCell>
                <TableCell>Filed</TableCell>
                <TableCell sx={{ width: 56 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.id} hover>
                  <TableCell>
                    {document.url ? (
                      <Typography
                        component="a"
                        href={document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        sx={{
                          color: "text.primary",
                          fontWeight: 600,
                          textDecoration: "none",
                          textUnderlineOffset: 3,
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        {document.title}
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {document.title}{" "}
                        <Typography component="span" variant="caption" color="text.secondary">
                          (file unavailable)
                        </Typography>
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatSize(document.sizeBytes)} · {document.uploaderName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={DOCUMENT_KIND_LABELS[document.kind]}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {document.team?.name ?? "Association-wide"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {dateFormatter.format(new Date(document.createdAt))}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {document.canRemove && (
                      <IconButton
                        size="small"
                        aria-label={`Remove ${document.title}`}
                        onClick={() => handleRemove(document.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Upload document</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Button variant="outlined" component="label" sx={{ minHeight: 44 }}>
              {file ? file.name : "Choose file (PDF, JPEG, PNG, HEIC)"}
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="application/pdf,image/jpeg,image/png,image/heic"
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  setFile(selected);
                  if (selected && !title) setTitle(selected.name);
                }}
              />
            </Button>

            {isUploading ? (
              <LinearProgress
                variant={progress === null ? "indeterminate" : "determinate"}
                value={progress ?? 0}
                aria-label="Upload progress"
              />
            ) : null}

            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />

            <Select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)} fullWidth>
              {DOCUMENT_KINDS.map((value) => (
                <MenuItem key={value} value={value}>
                  {DOCUMENT_KIND_LABELS[value]}
                </MenuItem>
              ))}
            </Select>

            {teams.length > 0 && (
              <Select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                displayEmpty
                fullWidth
              >
                {canUploadForLeague && (
                  <MenuItem value="">
                    <em>Association-wide</em>
                  </MenuItem>
                )}
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleUpload} disabled={isUploading || !file}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
