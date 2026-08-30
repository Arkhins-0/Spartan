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
  Typography,
} from "@mui/material";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { confirmEmailChange } from "@/lib/actions/account-lifecycle";
import { AUTH_MESSAGES } from "@/lib/config/constants";

export default function ConfirmEmailChangePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await confirmEmailChange(token);
      if (result.success) {
        router.push(`/login?message=${AUTH_MESSAGES.EMAIL_CHANGED}`);
        return;
      }
      setError(result.error);
    } catch (err) {
      console.error("Email change confirmation error:", err);
      setError("Something went wrong. Please try again.");
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
              Confirm email change
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2.5, textAlign: "center" }}
            >
              Confirm this as the new email address for your account. You&apos;ll need to log in
              again afterward.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              onClick={handleConfirm}
              fullWidth
              variant="contained"
              disabled={isLoading}
            >
              {isLoading ? "Confirming..." : "Confirm email change"}
            </Button>

            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <MuiLink component={Link} href="/login" underline="hover">
                  Back to log in
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
