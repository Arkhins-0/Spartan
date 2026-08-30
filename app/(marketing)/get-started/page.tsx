import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import { generatePageMetadata, getBreadcrumbSchema } from '@/lib/config/seo';
import StructuredData from '@/components/ui/StructuredData';
import { LinkButton } from '@/components/ui/NextLinkComposites';

export const metadata = generatePageMetadata({
  title: 'Get Started',
  description: 'Start managing your sports team with Spartan in minutes. Quick setup guide and onboarding to get your team organized.',
  path: '/get-started',
  keywords: ['getting started', 'onboarding', 'setup guide', 'quick start'],
});

const PROSE_WIDTH = '68ch';

const steps = [
  {
    label: 'Create Your Account',
    description:
      'Sign up with your email address and start managing your team for free. No credit card required.',
    action: 'Sign Up Now',
    actionHref: '/signup',
  },
  {
    label: 'Set Up Your Team',
    description:
      'Create your first team by providing a name, sport type, and basic information. This takes less than a minute.',
    details: ['Choose a team name', 'Select your sport', 'Add team details', 'Set up your preferences'],
  },
  {
    label: 'Invite Your Players',
    description:
      'Add players to your roster by sending email invitations. Players can accept and create their own accounts.',
    details: [
      'Add player email addresses',
      'Send invitations automatically',
      'Track invitation status',
      'Players join via email link',
    ],
  },
  {
    label: 'Schedule Your First Event',
    description:
      'Create a game or practice event with details like date, time, location, and opponent. Your team will be notified automatically.',
    details: [
      'Choose event type (Game or Practice)',
      'Set date and time',
      'Add location information',
      'Notify team members',
    ],
  },
  {
    label: 'Track RSVPs',
    description:
      'Team members receive email notifications and can RSVP with Going, Not Going, or Maybe. See attendance at a glance.',
    details: [
      'Players RSVP to events',
      'View attendance status',
      'Send reminders',
      'Update event details as needed',
    ],
  },
];

const helpLinks = [
  {
    title: 'Documentation',
    description: 'Comprehensive guides and tutorials to help you make the most of Spartan.',
    action: 'View Docs',
    href: '/docs',
  },
  {
    title: 'User Guide',
    description: 'Step-by-step instructions for common tasks and features.',
    action: 'Read Guide',
    href: '/docs/user-guide',
  },
  {
    title: 'Contact Support',
    description: 'Have questions? Our support team is ready to help.',
    action: 'Get Help',
    href: '/contact',
  },
];

export default function GetStartedPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Get Started', url: '/get-started' },
  ]);

  return (
    <>
      <StructuredData data={breadcrumbSchema} />

      {/* Page header */}
      <Box component="section" sx={{ bgcolor: 'background.default', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography variant="eyebrow" component="p" color="text.secondary" sx={{ mb: 1 }}>
            Get started
          </Typography>
          <Typography variant="sectionTitle" component="h1" sx={{ mb: 1.5 }}>
            Get Started with Spartan
          </Typography>
          <Typography variant="marketingBody" component="p" color="text.secondary" sx={{ maxWidth: PROSE_WIDTH }}>
            Your team can be up and running in minutes.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: PROSE_WIDTH }}>
            Follow these simple steps to replace your spreadsheets and group chats with Spartan.
          </Typography>
          <Box sx={{ mt: 3 }}>
            <LinkButton href="/signup" variant="contained" size="large">
              Sign Up Now
            </LinkButton>
          </Box>
        </Container>
      </Box>

      {/* Steps */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.paper', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="lg">
          <Stepper orientation="vertical" sx={{ maxWidth: PROSE_WIDTH }}>
            {steps.map((step) => (
              <Step key={step.label} active={true} expanded={true}>
                <StepLabel>
                  <Typography variant="h6" component="h2">
                    {step.label}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body1" paragraph>
                    {step.description}
                  </Typography>
                  {step.details && (
                    <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                      {step.details.map((detail) => (
                        <Typography component="li" key={detail} variant="body2" color="text.secondary">
                          {detail}
                        </Typography>
                      ))}
                    </Box>
                  )}
                  {step.action && step.actionHref && (
                    <LinkButton href={step.actionHref} variant="contained" sx={{ mt: 2 }}>
                      {step.action}
                    </LinkButton>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Container>
      </Box>

      {/* Help */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.default', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" gutterBottom>
            Need Help?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: PROSE_WIDTH }}>
            We&apos;re here to help you get started successfully.
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            {helpLinks.map((item) => (
              <Card key={item.href} sx={{ display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <LinkButton href={item.href} variant="outlined" size="small">
                    {item.action}
                  </LinkButton>
                </CardActions>
              </Card>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Final CTA */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.paper', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" gutterBottom>
            Ready to Get Started?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Sign up and begin managing your team in minutes.
          </Typography>
          <LinkButton href="/signup" variant="contained" size="large">
            Sign Up Now
          </LinkButton>
        </Container>
      </Box>
    </>
  );
}
