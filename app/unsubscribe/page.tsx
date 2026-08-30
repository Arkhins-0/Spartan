import { Alert, Box, Card, CardActions, CardContent, Typography } from "@mui/material";
import { CheckCircle as CheckCircleIcon, Error as ErrorIcon } from "@mui/icons-material";
import UnsubscribeIcon from "@mui/icons-material/Unsubscribe";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/NextLinkComposites";
import { handleUnsubscribe } from "@/lib/actions/notifications";

interface UnsubscribePageProps {
  searchParams: Promise<{
    token?: string;
  }>;
}

function ResultIcon({ ok }: { ok: boolean }) {
  return (
    <Box
      aria-hidden
      sx={{
        display: "flex",
        justifyContent: "center",
        mb: 1.5,
        color: ok ? "success.main" : "error.main",
        "& .MuiSvgIcon-root": { fontSize: 40 },
      }}
    >
      {ok ? <CheckCircleIcon /> : <ErrorIcon />}
    </Box>
  );
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <PageContainer maxWidth="sm">
        <PageHeader icon={<UnsubscribeIcon />} title="Unsubscribe" subtitle="Email notification preferences" />
        <Card>
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <ResultIcon ok={false} />
            <Typography variant="h5" component="h2" gutterBottom>
              Invalid unsubscribe link
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The unsubscribe link you clicked is invalid or incomplete. Please check your email
              and try clicking the link again.
            </Typography>
          </CardContent>
          <CardActions sx={{ justifyContent: "center" }}>
            <LinkButton href="/" variant="contained">
              Go to homepage
            </LinkButton>
          </CardActions>
        </Card>
      </PageContainer>
    );
  }

  // Process the unsubscribe request
  const result = await handleUnsubscribe({ token });

  return (
    <PageContainer maxWidth="sm">
      <PageHeader icon={<UnsubscribeIcon />} title="Unsubscribe" subtitle="Email notification preferences" />
      <Card>
        <CardContent sx={{ textAlign: "center", py: 4 }}>
          {result.success ? (
            <>
              <ResultIcon ok />
              <Typography variant="h5" component="h2" gutterBottom>
                Successfully unsubscribed
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You have been unsubscribed from email notifications
                {result.data.leagueName && ` for ${result.data.leagueName}`}.
              </Typography>
              <Alert severity="info" sx={{ mt: 2, textAlign: "left" }}>
                <Typography variant="body2" component="div">
                  <strong>What this means:</strong>
                  <br />
                  • You will no longer receive email notifications
                  <br />
                  • You can still access your account and use the platform
                  <br />
                  • You can re-enable notifications in your account settings
                </Typography>
              </Alert>
            </>
          ) : (
            <>
              <ResultIcon ok={false} />
              <Typography variant="h5" component="h2" gutterBottom>
                Unsubscribe failed
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {result.error || "The unsubscribe link is invalid or has expired."}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                If you continue to receive unwanted emails, please contact support or sign in to
                your account to manage your notification preferences.
              </Typography>
            </>
          )}
        </CardContent>
        <CardActions sx={{ justifyContent: "center" }}>
          <LinkButton href="/login" variant="contained">
            Sign in to account
          </LinkButton>
          <LinkButton href="/" variant="outlined">
            Go to homepage
          </LinkButton>
        </CardActions>
      </Card>
    </PageContainer>
  );
}
