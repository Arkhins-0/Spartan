"use client";

import { useState } from "react";
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
import { requestPasswordReset } from "@/lib/actions/account-lifecycle";
import { forgotPasswordSchema } from "@/lib/utils/validation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");
    setGeneralError("");

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setFieldError(validation.error.issues[0]?.message ?? "Invalid email address");
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestPasswordReset(validation.data);
      if (result.success) {
        setSuccessMessage(result.data.message);
      } else {
        setGeneralError(result.error);
      }
    } catch (error) {
      console.error("Password reset request error:", error);
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
              Forgot password
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2.5, textAlign: "center" }}
            >
              Enter your email and we&apos;ll send you a link to reset your password
            </Typography>

            {successMessage && (
              <Alert severity="success" sx={{ width: "100%", mb: 2 }}>
                {successMessage}
              </Alert>
            )}

            {generalError && (
              <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
                {generalError}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldError("");
                }}
                error={!!fieldError}
                helperText={fieldError}
                inputProps={{ inputMode: "email" }}
                disabled={!!successMessage}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2.5, mb: 2 }}
                disabled={isLoading || !email || !!successMessage}
              >
                {isLoading ? "Sending..." : "Send reset link"}
              </Button>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Remembered your password?{" "}
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
