"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Container,
  Link as MuiLink,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { resetPassword } from "@/lib/actions/account-lifecycle";
import { resetPasswordSchema } from "@/lib/utils/validation";
import { AUTH_MESSAGES } from "@/lib/config/constants";

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError("");

    const validation = resetPasswordSchema.safeParse({ token, password });
    if (!validation.success) {
      setFieldErrors({ password: validation.error.issues[0]?.message ?? "Invalid password" });
      return;
    }
    if (password !== confirmPassword) {
      setFieldErrors({ confirm: "Passwords do not match" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword(validation.data);
      if (result.success) {
        router.push(`/login?message=${AUTH_MESSAGES.PASSWORD_RESET_SUCCESS}`);
        return;
      }
      setGeneralError(result.error);
    } catch (error) {
      console.error("Password reset error:", error);
      setGeneralError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        py: { xs: 3, sm: 6 },
        px: 1.5,
      }}
    >
      <Container maxWidth={false} disableGutters sx={{ maxWidth: 400 }}>
        <Paper sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Box sx={{ mb: 2 }}>
              <Logo size="large" priority href={null} />
            </Box>
            <Typography
              component="h1"
              variant="h3"
              sx={{ fontSize: "1.25rem", fontWeight: 600, mb: 0.5 }}
            >
              Reset password
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Choose a new password for your account
            </Typography>

            {generalError && (
              <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
                {generalError}{" "}
                <MuiLink
                  component={Link}
                  href="/forgot-password"
                  underline="hover"
                  sx={{ fontWeight: 600 }}
                >
                  Request a new link
                </MuiLink>
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="New Password"
                type="password"
                id="password"
                autoComplete="new-password"
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                error={!!fieldErrors.password}
                helperText={fieldErrors.password ?? "At least 8 characters"}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm New Password"
                type="password"
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, confirm: undefined }));
                }}
                error={!!fieldErrors.confirm}
                helperText={fieldErrors.confirm}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2.5, mb: 2 }}
                disabled={isLoading || !password || !confirmPassword}
              >
                {isLoading ? "Updating..." : "Update password"}
              </Button>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Back to{" "}
                  <MuiLink component={Link} href="/login" underline="hover">
                    Log in
                  </MuiLink>
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
