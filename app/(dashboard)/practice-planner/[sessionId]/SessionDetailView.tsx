"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Box,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  IconButton,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  LinkOff as UnshareIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  AccessTime as ClockIcon,
  SportsHockey as HockeyIcon,
} from "@mui/icons-material";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  deletePracticeSession,
  sharePracticeSession,
} from "@/lib/actions/practice-sessions";

interface SessionPlay {
  id: string;
  sequence: number;
  duration: number;
  instructions: string | null;
  play: {
    id: string;
    name: string;
    description: string | null;
    thumbnail: string | null;
  };
}

interface SessionData {
  id: string;
  title: string;
  date: string;
  duration: number;
  isShared: boolean;
  createdByName: string;
  teamId: string;
  teamName: string;
  // Optional venue attachment (feature 006, FR-019)
  venueId?: string | null;
  venueName?: string | null;
  surfaceId?: string | null;
  surfaceName?: string | null;
  segmentId?: string | null;
  segmentName?: string | null;
  startAt?: string | null;
  plays: SessionPlay[];
}

interface SessionDetailViewProps {
  session: SessionData;
  isAdmin: boolean;
}

export function SessionDetailView({ session, isAdmin }: SessionDetailViewProps) {
  const router = useRouter();

  const [activePlayIndex, setActivePlayIndex] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShared, setIsShared] = useState(session.isShared);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    setError(null);

    const result = await deletePracticeSession({
      id: session.id,
      teamId: session.teamId,
    });

    if (result.success) {
      router.push("/practice-planner");
    } else {
      setError(result.error);
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [session.id, session.teamId, router]);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    setError(null);
    setShowShareDialog(false);

    const result = await sharePracticeSession({
      id: session.id,
      teamId: session.teamId,
      isShared: !isShared,
    });

    if (result.success) {
      setIsShared(result.data.isShared);
    } else {
      setError(result.error);
    }
    setIsSharing(false);
  }, [session.id, session.teamId, isShared]);

  const handlePrevPlay = useCallback(() => {
    setActivePlayIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextPlay = useCallback(() => {
    setActivePlayIndex((prev) => Math.min(session.plays.length - 1, prev + 1));
  }, [session.plays.length]);

  const totalPlayTime = session.plays.reduce((sum, p) => sum + p.duration, 0);
  const durationPercent = Math.min(
    (totalPlayTime / session.duration) * 100,
    100
  );
  const isOverTime = totalPlayTime > session.duration;
  const sessionDate = new Date(session.date);
  const activePlay = session.plays[activePlayIndex] ?? null;

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  // One line of status under the title: when, how long, how many plays, who,
  // and the ice booking (feature 006, FR-019) when there is one.
  const booking = session.venueName
    ? [
        session.venueName,
        session.surfaceName,
        session.segmentName,
        session.startAt ? formatTime(new Date(session.startAt)) : null,
      ]
        .filter(Boolean)
        .join(" ")
    : null;
  const subtitle = [
    `${formatDate(sessionDate)} at ${formatTime(sessionDate)}`,
    `${session.duration} min`,
    `${session.plays.length} play${session.plays.length !== 1 ? "s" : ""}`,
    session.createdByName,
    booking,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Session Header */}
      <PageHeader
        icon={<HockeyIcon />}
        title={session.title}
        subtitle={subtitle}
        actions={
          <>
            {isShared && (
              <Chip label="Shared" size="small" variant="outlined" sx={{ alignSelf: "center" }} />
            )}
            {isAdmin && (
              <>
                <Tooltip title={isShared ? "Unshare from team" : "Share with team"}>
                  <Button
                    variant="outlined"
                    startIcon={isShared ? <UnshareIcon /> : <ShareIcon />}
                    onClick={() => setShowShareDialog(true)}
                    disabled={isSharing}
                  >
                    {isSharing ? "..." : isShared ? "Unshare" : "Share"}
                  </Button>
                </Tooltip>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isDeleting}
                >
                  Delete
                </Button>
                <Button
                  component={Link}
                  href={`/practice-planner/${session.id}/edit`}
                  variant="contained"
                  startIcon={<EditIcon />}
                >
                  Edit
                </Button>
              </>
            )}
          </>
        }
      />

      {/* Error */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Duration progress */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
            <Typography variant="eyebrow" component="span">
              Time allocation
            </Typography>
            <Typography
              variant="caption"
              color={isOverTime ? "error.main" : "text.secondary"}
              fontWeight={isOverTime ? 700 : 400}
            >
              {totalPlayTime} / {session.duration} min
              {isOverTime && " (over time!)"}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={durationPercent}
            color={isOverTime ? "error" : "primary"}
            aria-label="Share of session time allocated to plays"
          />
        </CardContent>
      </Card>

      {/* Content area */}
      {session.plays.length === 0 ? (
        <EmptyState
          icon={<HockeyIcon />}
          title="No plays in this session"
          description={
            isAdmin
              ? "Edit the session to add plays from the library."
              : "The coach hasn't added any plays yet."
          }
          action={
            isAdmin ? (
              <Button
                component={Link}
                href={`/practice-planner/${session.id}/edit`}
                variant="contained"
                startIcon={<EditIcon />}
              >
                Edit session
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          {/* Play list sidebar */}
          <Box
            sx={{
              width: { xs: "100%", md: 280 },
              flexShrink: 0,
              order: { xs: 2, md: 1 },
            }}
          >
            <Typography variant="eyebrow" component="h2" sx={{ display: "block", mb: 1 }}>
              Play sequence
            </Typography>
            <Stack spacing={1}>
              {session.plays.map((sp, index) => {
                const isActive = index === activePlayIndex;
                return (
                  <Card
                    key={sp.id}
                    onClick={() => setActivePlayIndex(index)}
                    sx={{
                      cursor: "pointer",
                      // The active row is a step of grey and a heavier label.
                      bgcolor: isActive ? "action.selected" : "background.paper",
                      borderColor: isActive ? "var(--sp-border-input)" : undefined,
                      "&:hover": { bgcolor: isActive ? "action.selected" : "action.hover" },
                    }}
                  >
                    <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        {/* Play number */}
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            bgcolor: isActive ? "text.primary" : "action.hover",
                            color: isActive ? "background.paper" : "text.secondary",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {index + 1}
                        </Box>

                        {/* Thumbnail */}
                        <Box
                          sx={{
                            width: 48,
                            height: 32,
                            borderRadius: 1,
                            bgcolor: "action.hover",
                            border: "1px solid var(--sp-border)",
                            overflow: "hidden",
                            position: "relative",
                            flexShrink: 0,
                          }}
                        >
                          {sp.play.thumbnail ? (
                            <Image
                              src={sp.play.thumbnail}
                              alt=""
                              fill
                              style={{ objectFit: "cover" }}
                              unoptimized
                            />
                          ) : (
                            <Box
                              sx={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <HockeyIcon sx={{ fontSize: 14, color: "text.disabled" }} />
                            </Box>
                          )}
                        </Box>

                        {/* Name & duration */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            fontWeight={isActive ? 600 : 500}
                            noWrap
                          >
                            {sp.play.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {sp.duration} min
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </Box>

          {/* Main play viewer */}
          <Box sx={{ flex: 1, minWidth: 0, order: { xs: 1, md: 2 } }}>
            {activePlay && (
              <Card sx={{ overflow: "hidden" }}>
                {/* Play navigation header */}
                <CardHeader
                  title={`Play ${activePlayIndex + 1} of ${session.plays.length}`}
                  action={
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        onClick={handlePrevPlay}
                        disabled={activePlayIndex === 0}
                        size="small"
                        aria-label="Previous play"
                      >
                        <PrevIcon />
                      </IconButton>
                      <IconButton
                        onClick={handleNextPlay}
                        disabled={activePlayIndex === session.plays.length - 1}
                        size="small"
                        aria-label="Next play"
                      >
                        <NextIcon />
                      </IconButton>
                    </Stack>
                  }
                />

                {/* Thumbnail / rink preview */}
                <Box
                  sx={{
                    width: "100%",
                    height: { xs: 220, sm: 300, md: 360 },
                    bgcolor: "action.hover",
                    borderBottom: "1px solid var(--sp-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  {activePlay.play.thumbnail ? (
                    <Image
                      src={activePlay.play.thumbnail}
                      alt={activePlay.play.name}
                      fill
                      style={{ objectFit: "contain" }}
                      unoptimized
                    />
                  ) : (
                    <Stack alignItems="center" spacing={1}>
                      <HockeyIcon sx={{ fontSize: 40, color: "text.disabled" }} />
                      <Typography variant="body2" color="text.secondary">
                        No preview available
                      </Typography>
                    </Stack>
                  )}
                </Box>

                {/* Play details */}
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1}
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="h5" component="h2">
                      {activePlay.play.name}
                    </Typography>
                    <Chip
                      icon={<ClockIcon />}
                      label={`${activePlay.duration} min`}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>

                  {activePlay.play.description && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="eyebrow" component="span" sx={{ display: "block" }}>
                        Description
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {activePlay.play.description}
                      </Typography>
                    </Box>
                  )}

                  {activePlay.instructions && (
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "action.hover",
                        border: "1px solid var(--sp-border)",
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="eyebrow" component="span" sx={{ display: "block" }}>
                        Coach&apos;s instructions
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {activePlay.instructions}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        </Stack>
      )}

      {/* Delete dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Practice Session?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &quot;{session.title}&quot;? This
            action cannot be undone and all plays in this session will be
            removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} disabled={isDeleting} variant="text">
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={
              isDeleting ? <CircularProgress size={18} color="inherit" /> : null
            }
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share dialog */}
      <Dialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        aria-labelledby="share-dialog-title"
      >
        <DialogTitle id="share-dialog-title">
          {isShared ? "Unshare" : "Share"} Practice Session?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {isShared
              ? "This will hide the practice session from team members. They will no longer be able to view it."
              : `This will share "${session.title}" with all members of ${session.teamName}. They will be notified by email.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowShareDialog(false)} disabled={isSharing} variant="text">
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            variant="contained"
            disabled={isSharing}
            startIcon={
              isSharing ? <CircularProgress size={18} color="inherit" /> : null
            }
          >
            {isSharing ? "..." : isShared ? "Unshare" : "Share"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
