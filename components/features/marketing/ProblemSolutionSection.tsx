'use client';

import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

const comparisons = [
  {
    problem: 'Roster details scattered across spreadsheets, emails, and text threads.',
    solution: 'One secure roster keeps player, guardian, and staff details organized.',
  },
  {
    problem: 'Coaches guess attendance from half-answered group chats before every event.',
    solution: 'Live RSVP status shows who is going, maybe, or out at a glance.',
  },
  {
    problem: 'Last-minute changes get buried and families miss the latest update.',
    solution: 'Targeted reminders and event updates keep the right people informed.',
  },
];

export default function ProblemSolutionSection() {
  return (
    <Box
      component="section"
      aria-labelledby="problem-solution-heading"
      sx={{
        py: { xs: 8, md: 12 },
        bgcolor: 'background.paper',
        borderTop: '1px solid var(--sp-border)',
        borderBottom: '1px solid var(--sp-border)',
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={2} alignItems="center" textAlign="center" sx={{ mb: 6 }}>
          <Chip icon={<CompareArrowsIcon />} label="Problem → Solution" variant="outlined" />
          <Typography id="problem-solution-heading" variant="sectionTitle" component="h2">
            Trade Team-Management Chaos for One Clear Playbook
          </Typography>
          <Typography variant="marketingBody" color="text.secondary" sx={{ maxWidth: 640 }}>
            Spartan turns the everyday admin grind into a simple workflow your whole team can follow.
          </Typography>
        </Stack>

        <Grid container spacing={2} alignItems="stretch">
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              component="section"
              aria-labelledby="team-management-chaos-heading"
              sx={{ height: '100%' }}
            >
              <CardHeader
                avatar={<WarningAmberIcon color="error" fontSize="small" />}
                title={
                  <Typography id="team-management-chaos-heading" component="h3" variant="featureTitle">
                    The usual team-management chaos
                  </Typography>
                }
                slotProps={{ avatar: { sx: { mr: 1.5, display: 'flex' } } }}
              />
              <CardContent>
                <Stack spacing={1.5}>
                  {comparisons.map((item) => (
                    <Box
                      key={item.problem}
                      sx={{
                        pl: 1.5,
                        borderLeft: '3px solid',
                        borderLeftColor: 'error.main',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {item.problem}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              component="section"
              aria-labelledby="spartan-playbook-heading"
              sx={{ height: '100%' }}
            >
              <CardHeader
                avatar={<TaskAltIcon color="success" fontSize="small" />}
                title={
                  <Typography id="spartan-playbook-heading" component="h3" variant="featureTitle">
                    The Spartan playbook
                  </Typography>
                }
                slotProps={{ avatar: { sx: { mr: 1.5, display: 'flex' } } }}
              />
              <CardContent>
                <Stack spacing={1.5}>
                  {comparisons.map((item) => (
                    <Box
                      key={item.solution}
                      sx={{
                        pl: 1.5,
                        borderLeft: '3px solid',
                        borderLeftColor: 'success.main',
                      }}
                    >
                      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                        {item.solution}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
