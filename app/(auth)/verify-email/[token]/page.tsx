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
import { confirmEmailVerification } from "@/lib/actions/account-lifecycle";

export default function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await confirmEmailVerification(token);
      if (result.success) {
        router.push("/login?verified=1");
        return;
      }
      setError(result.error);
    } catch (err) {
      console.error("Email verification error:", err);
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
              Verify your email
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2.5, textAlign: "center" }}
            >
              Click the button below to confirm this email address and activate your account.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              onClick={handleVerify}
              fullWidth
              variant="contained"
              disabled={isLoading}
            >
              {isLoading ? "Verifying..." : "Verify email"}
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
