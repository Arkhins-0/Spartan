"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import {
  changePassword,
  deleteAccount,
  requestEmailChange,
  updateProfile,
} from "@/lib/actions/account";
import { AUTH_MESSAGES } from "@/lib/config/constants";
import { NotificationPreferencesComponent } from "@/components/features/settings/NotificationPreferences";

interface AccountSettingsProps {
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: string;
  adminTeamCount: number;
}

interface SectionState {
  loading: boolean;
  error: string;
  success: string;
}

const idleSection: SectionState = { loading: false, error: "", success: "" };

/**
 * Account sections as a stack of cards. The page owns the PageHeader (title,
 * email, member-since); `createdAt` stays in the props contract for callers.
 */
export default function AccountSettings({
  email,
  name,
  emailVerified,
  adminTeamCount,
}: AccountSettingsProps) {
  const router = useRouter();

  const [profileName, setProfileName] = useState(name ?? "");
  const [profileState, setProfileState] = useState<SectionState>(idleSection);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordState, setPasswordState] = useState<SectionState>(idleSection);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailState, setEmailState] = useState<SectionState>(idleSection);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteState, setDeleteState] = useState<SectionState>(idleSection);

  const handleProfileSave = async () => {
    setProfileState({ ...idleSection, loading: true });
    const result = await updateProfile({ name: profileName || undefined });
    if (result.success) {
      setProfileState({ ...idleSection, success: "Profile updated" });
      router.refresh();
    } else {
      setProfileState({ ...idleSection, error: result.error });
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmNewPassword) {
      setPasswordState({ ...idleSection, error: "New passwords do not match" });
      return;
    }
    setPasswordState({ ...idleSection, loading: true });
    const result = await changePassword({ currentPassword, newPassword });
    if (result.success) {
      // Changing the password evicts all sessions (server-side sessionVersion
      // bump), so sign out and send the user to log in with the new password.
      setPasswordState({ ...idleSection, success: "Password updated — signing you out…" });
      await signOut({ callbackUrl: `/login?message=${AUTH_MESSAGES.PASSWORD_RESET_SUCCESS}` });
    } else {
      setPasswordState({ ...idleSection, error: result.error });
    }
  };

  const handleEmailChange = async () => {
    setEmailState({ ...idleSection, loading: true });
    const result = await requestEmailChange({ newEmail, password: emailPassword });
    if (result.success) {
      setEmailState({ ...idleSection, success: result.data.message });
      setNewEmail("");
      setEmailPassword("");
    } else {
      setEmailState({ ...idleSection, error: result.error });
    }
  };

  const handleDelete = async () => {
    setDeleteState({ ...idleSection, loading: true });
    const result = await deleteAccount({ password: deletePassword });
    if (result.success) {
      await signOut({ callbackUrl: "/" });
    } else {
      setDeleteState({ ...idleSection, error: result.error });
    }
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Card component="section">
          <CardHeader
            title="Profile"
            subheader="The name shown to your teams."
            slotProps={{ title: { component: "h2" } }}
          />
          <CardContent>
            <Stack spacing={2}>
              {profileState.error && <Alert severity="error">{profileState.error}</Alert>}
              {profileState.success && <Alert severity="success">{profileState.success}</Alert>}
              <TextField
                label="Name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                fullWidth
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
            </Stack>
          </CardContent>
          <CardActions>
            <Button
              variant="contained"
              onClick={handleProfileSave}
              disabled={profileState.loading || profileName === (name ?? "")}
            >
              {profileState.loading ? "Saving..." : "Save profile"}
            </Button>
          </CardActions>
        </Card>

        <Card component="section">
          <CardHeader
            title="Email"
            subheader={email}
            slotProps={{ title: { component: "h2" } }}
            action={
              <Chip
                size="small"
                color={emailVerified ? "success" : "warning"}
                label={emailVerified ? "Verified" : "Unverified"}
              />
            }
          />
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Changing your address sends a confirmation link to the new address; nothing
                changes until you click it.
              </Typography>
              {emailState.error && <Alert severity="error">{emailState.error}</Alert>}
              {emailState.success && <Alert severity="success">{emailState.success}</Alert>}
              <TextField
                label="New email address"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                fullWidth
                autoComplete="email"
              />
              <TextField
                label="Current password"
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                fullWidth
                autoComplete="current-password"
              />
            </Stack>
          </CardContent>
          <CardActions>
            <Button
              variant="contained"
              onClick={handleEmailChange}
              disabled={emailState.loading || !newEmail || !emailPassword}
            >
              {emailState.loading ? "Sending..." : "Change email"}
            </Button>
          </CardActions>
        </Card>

        <Card component="section">
          <CardHeader
            title="Password"
            subheader="Changing it signs you out everywhere."
            slotProps={{ title: { component: "h2" } }}
          />
          <CardContent>
            <Stack spacing={2}>
              {passwordState.error && <Alert severity="error">{passwordState.error}</Alert>}
              {passwordState.success && <Alert severity="success">{passwordState.success}</Alert>}
              <TextField
                label="Current password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                fullWidth
                autoComplete="current-password"
              />
              <TextField
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                autoComplete="new-password"
                helperText="At least 8 characters"
              />
              <TextField
                label="Confirm new password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                fullWidth
                autoComplete="new-password"
              />
            </Stack>
          </CardContent>
          <CardActions>
            <Button
              variant="contained"
              onClick={handlePasswordChange}
              disabled={
                passwordState.loading || !currentPassword || !newPassword || !confirmNewPassword
              }
            >
              {passwordState.loading ? "Updating..." : "Change password"}
            </Button>
          </CardActions>
        </Card>

        <Card component="section">
          <CardHeader
            title="Your data"
            subheader="Profile, memberships, roster links, RSVPs and registrations as JSON."
            slotProps={{ title: { component: "h2" } }}
          />
          <CardActions>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              component="a"
              href="/api/account/export"
              download
            >
              Export my data
            </Button>
          </CardActions>
        </Card>

        {/* Renders its own outlined cards (global prefs + per-league accordions) */}
        <NotificationPreferencesComponent />

        <Card component="section" sx={{ borderColor: "error.main" }}>
          <CardHeader
            title="Danger zone"
            subheader="Deleting your account cannot be undone."
            slotProps={{ title: { component: "h2", color: "error" } }}
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Deleting your account permanently removes your profile, memberships, RSVPs,
              and registrations.
              {adminTeamCount > 0 && (
                <>
                  {" "}
                  You are an admin of {adminTeamCount} team{adminTeamCount === 1 ? "" : "s"} —
                  consider transferring admin rights first, or those teams may be left without
                  an administrator.
                </>
              )}
            </Typography>
          </CardContent>
          <CardActions>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForeverIcon />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete account
            </Button>
          </CardActions>
        </Card>
      </Stack>

      <Dialog open={deleteDialogOpen} onClose={() => !deleteState.loading && setDeleteDialogOpen(false)}>
        <DialogTitle>Delete your account?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This permanently deletes your account and cannot be undone. Enter your
            password to confirm.
          </DialogContentText>
          {deleteState.error && <Alert severity="error" sx={{ mb: 2 }}>{deleteState.error}</Alert>}
          <TextField
            label="Password"
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            fullWidth
            autoFocus
            autoComplete="current-password"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteState.loading}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleteState.loading || !deletePassword}
          >
            {deleteState.loading ? "Deleting..." : "Permanently delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
