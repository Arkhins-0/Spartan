"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Chip,
} from "@mui/material";
import {
  SportsHockey as HockeyIcon,
  Groups as TeamsIcon,
  EmojiEvents as LeagueIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { PageHeader } from "@/components/ui/PageHeader";
import CreateTeamForm from "@/components/features/team/CreateTeamForm";
import CreateLeagueOnboardingForm from "@/components/features/onboarding/CreateLeagueOnboardingForm";

type Intent = "team" | "league" | null;

export default function OnboardingFlow() {
  const [intent, setIntent] = useState<Intent>(null);

  if (intent === "team") {
    return (
      <OnboardingShell
        title="Create your team"
        subtitle="Roster, schedule and RSVPs for a single team."
        onBack={() => setIntent(null)}
      >
        <CreateTeamForm />
      </OnboardingShell>
    );
  }

  if (intent === "league") {
    return (
      <OnboardingShell
        title="Create your league"
        subtitle="Divisions, teams and cross-team scheduling under one roof."
        onBack={() => setIntent(null)}
      >
        <CreateLeagueOnboardingForm />
      </OnboardingShell>
    );
  }

  return (
    <Box>
      <PageHeader
        icon={<HockeyIcon />}
        title="Welcome to Spartan"
        subtitle="Tell us how you're using Spartan and we'll get you set up in seconds."
      />

      {/* Intent cards */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <IntentCard
          icon={<TeamsIcon />}
          title="I manage a team"
          description="Create a single team — manage your roster, schedule games & practices, and track RSVPs."
          badge="Most common"
          onClick={() => setIntent("team")}
        />
        <IntentCard
          icon={<LeagueIcon />}
          title="I run a league or association"
          description="Organize multiple teams under one league, manage divisions, and schedule games across teams."
          onClick={() => setIntent("league")}
        />
      </Stack>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 2 }}
      >
        You can create additional teams and leagues from your dashboard at any time.
      </Typography>
    </Box>
  );
}

function IntentCard({
  icon,
  title,
  description,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <Card
      sx={{
        flex: 1,
        // Hover is a heavier hairline and the muted surface — no lift, no glow.
        "&:hover": { borderColor: "var(--sp-border-input)" },
        "&:focus-within": { borderColor: "var(--sp-ring)" },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: "100%", minHeight: 44 }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Box
              aria-hidden
              sx={{ color: "text.secondary", display: "flex", "& .MuiSvgIcon-root": { fontSize: 28 } }}
            >
              {icon}
            </Box>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
                <Typography variant="subtitle1" component="h2">
                  {title}
                </Typography>
                {badge && <Chip label={badge} size="small" />}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function OnboardingShell({
  title,
  subtitle,
  children,
  onBack,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <Box>
      <PageHeader
        icon={<HockeyIcon />}
        title={title}
        subtitle={subtitle}
        actions={
          <Button onClick={onBack} variant="text" startIcon={<ArrowBackIcon />}>
            Back
          </Button>
        }
      />
      <Box sx={{ maxWidth: 560, mx: "auto" }}>{children}</Box>
    </Box>
  );
}
