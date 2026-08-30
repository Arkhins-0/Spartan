import type { Metadata } from 'next';
import { Box, Typography, Card, CardHeader, CardContent, Chip, Stack } from '@mui/material';

type RoadmapStatus = 'In Progress' | 'Planned' | 'Researching';
// Status is the one place colour means something here: everything else is grey.
type ChipColor = 'success' | 'info' | 'warning';

interface RoadmapItem {
  id: string;
  label: string;
  description: string;
  status: RoadmapStatus;
  color: ChipColor;
}

const roadmapItems: RoadmapItem[] = [
  {
    id: 'season-setup-tools',
    label: 'Season Setup Tools',
    description:
      'Create recurring events, manage scheduling conflicts, and duplicate last season\'s schedule so managers can launch a new season in minutes.',
    status: 'In Progress',
    color: 'success',
  },
  {
    id: 'mobile-app-preview',
    label: 'Mobile App Preview',
    description:
      'Early access to the React Native companion app focused on RSVP flows, chat, and real-time updates while on the go.',
    status: 'Planned',
    color: 'info',
  },
  {
    id: 'advanced-permissions',
    label: 'Advanced Permissions',
    description:
      'Role-based access for coaches, captains, and volunteers with scoped control over rosters, announcements, and financial data.',
    status: 'Planned',
    color: 'info',
  },
  {
    id: 'integrations-api',
    label: 'Integrations & API',
    description:
      'REST and GraphQL endpoints, calendar sync (iCal, Google Calendar), and automation hooks for Zapier and other tools.',
    status: 'Researching',
    color: 'warning',
  },
];

export const metadata: Metadata = {
  title: 'Product Roadmap - Spartan Docs',
  description: 'See the high-level roadmap for upcoming Spartan features and improvements.',
};

export default function RoadmapPage() {
  return (
    <Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        We&apos;re actively building Spartan with the community. This roadmap highlights the initiatives on deck. Timelines may shift, and we&apos;ll keep this page updated as milestones are reached.
      </Typography>

      <Stack spacing={2}>
        {roadmapItems.map((item) => (
          <Card key={item.id}>
            <CardHeader
              title={item.label}
              slotProps={{ title: { component: 'h2' } }}
              action={<Chip label={item.status} color={item.color} size="small" variant="outlined" />}
            />
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {item.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
        Have feedback or want to influence the roadmap? Join the discussion on GitHub issues or reach out through the contact page.
      </Typography>
    </Box>
  );
}
