import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Event as EventIcon,
  Groups as GroupsIcon,
  Mail as MailIcon,
  Security as SecurityIcon,
  MoneyOff as MoneyOffIcon,
  Shield as ShieldIcon,
  Code as CodeIcon,
  CloudDownload as CloudDownloadIcon,
  AccountTree as AccountTreeIcon,
} from '@mui/icons-material';
import CTAButton from '@/components/features/marketing/CTAButton';
import { generatePageMetadata, getBreadcrumbSchema, getFAQSchema } from '@/lib/config/seo';
import StructuredData from '@/components/ui/StructuredData';

export const metadata = generatePageMetadata({
  title: 'Pricing',
  description:
    'Spartan is free forever for teams — roster, scheduling, RSVPs, and communication with no subscriptions and no credit card. Optional paid tiers for leagues and clubs fund the free team plan.',
  path: '/pricing',
  keywords: ['pricing', 'free race team management', 'free motorsport software', 'championship management pricing'],
});

const PROSE_WIDTH = '68ch';

const includedFeatures = [
  {
    icon: GroupsIcon,
    title: 'Roster management',
    description: 'Create teams, invite members, and keep roster details in one secure place.',
  },
  {
    icon: EventIcon,
    title: 'Scheduling and RSVPs',
    description: 'Publish race weekends and sessions, then track entries before every round.',
  },
  {
    icon: MailIcon,
    title: 'Team communication',
    description: 'Send invitations and event updates without juggling spreadsheets or group chats.',
  },
  {
    icon: SecurityIcon,
    title: 'Role-based access',
    description: 'Give admins and members the right level of access for each team or league.',
  },
];

const commitments = [
  {
    icon: MoneyOffIcon,
    title: 'No per-team paywall, ever',
    description:
      'Teams manage rosters, schedules, and communication for free — no seat limits, no per-roster fees, no countdown to a bill.',
  },
  {
    icon: ShieldIcon,
    title: 'No third-party ads',
    description:
      'We never sell ads against your team — especially not on pages that include kids’ data.',
  },
  {
    icon: CodeIcon,
    title: 'Open-source and self-hostable',
    description:
      'The source is public under the Apache License 2.0 — fork it, self-host it, or run it commercially, anytime.',
  },
  {
    icon: CloudDownloadIcon,
    title: 'Your data is exportable',
    description:
      'Your roster and schedule belong to you. Export your data whenever you need it — no lock-in.',
  },
];

const leagueFeatures = [
  'Multiple teams and divisions in one organization',
  'Cross-team and cross-division scheduling',
  'Circuit and track-time allocation across teams',
  'Org-wide communications and announcements',
  'Custom domain for your league or club',
  'Single sign-on (SSO) for staff and admins',
  'Data export for your whole organization',
  'Priority support from the Spartan team',
];

const faqs = [
  {
    question: 'Is Spartan free?',
    answer:
      'Yes. Managing your team on Spartan is free, permanently — no subscriptions, no paid feature gates, and no credit card.',
  },
  {
    question: 'Is it really free for teams?',
    answer:
      'Yes, permanently. The free team plan is a commitment, not a trial. Teams don’t pay us to run their entry list, schedule, and communication — not per player, not per season, not ever.',
  },
  {
    question: 'Do I need a credit card to start?',
    answer:
      'No. Teams can sign up and start using Spartan right away without a credit card — now or ever.',
  },
  {
    question: 'How does Spartan make money?',
    answer:
      'Through optional paid tiers for leagues and clubs (below) and, later, opt-in local sponsorships that clubs choose — never by charging teams or showing third-party ads.',
  },
];

export default function PricingPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Pricing', url: '/pricing' },
  ]);
  const faqSchema = getFAQSchema(faqs);

  return (
    <>
      <StructuredData data={[breadcrumbSchema, faqSchema]} />

      {/* Page header */}
      <Box component="section" sx={{ bgcolor: 'background.default', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography variant="eyebrow" component="p" color="text.secondary" sx={{ mb: 1 }}>
            Pricing
          </Typography>
          <Typography variant="sectionTitle" component="h1" sx={{ mb: 1.5 }}>
            Simple Pricing for Busy Teams
          </Typography>
          <Typography variant="marketingBody" component="p" color="text.secondary" sx={{ maxWidth: PROSE_WIDTH }}>
            Spartan gives race organisers and team managers the core championship tools they need — free, forever, with no subscriptions, paid tiers, or credit card.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
            <CTAButton
              href="/signup"
              variant="contained"
              size="large"
              trackingAction="pricing_start_free_click"
              trackingLabel="pricing_hero"
            >
              Start Free Today
            </CTAButton>
            <CTAButton
              href="/features"
              variant="outlined"
              size="large"
              trackingAction="pricing_compare_features_click"
              trackingLabel="pricing_hero"
            >
              Compare Features
            </CTAButton>
          </Stack>
        </Container>
      </Box>

      {/* Tiers */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.paper', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="lg">
          <Stack spacing={2}>
            {/* Free team plan — the recommended tier */}
            <Card sx={{ border: '2px solid', borderColor: 'primary.main' }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-between">
                  <Box>
                    <Chip label="Free forever for teams" sx={{ mb: 2 }} />
                    <Typography variant="h3" component="h2" gutterBottom>
                      Free Team Plan
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: PROSE_WIDTH }}>
                      Built for teams replacing spreadsheets, email chains, and group chats with one organized hub.
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: { xs: 'left', md: 'right' }, flexShrink: 0 }}>
                    <Typography variant="h1" component="p">
                      $0
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      No credit card required
                    </Typography>
                  </Box>
                </Stack>
                <Divider sx={{ my: 3 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                  {includedFeatures.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <Stack key={feature.title} direction="row" spacing={1.5} alignItems="flex-start">
                        <Icon sx={{ color: 'text.secondary', fontSize: 22, mt: 0.25 }} />
                        <Box>
                          <Typography variant="h6" component="h3" gutterBottom>
                            {feature.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {feature.description}
                          </Typography>
                        </Box>
                      </Stack>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>

            {/* Explicit, written free commitment */}
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 22, mt: 0.25 }} />
                  <Typography variant="subtitle1" component="p">
                    This isn&apos;t a trial or a countdown. Teams don&apos;t pay us — not per player, not per season, not ever.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            {/* League & Club tier — contact-driven, funds the free team plan */}
            <Card>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={3}
                  justifyContent="space-between"
                  alignItems={{ md: 'center' }}
                >
                  <Box>
                    <Chip
                      icon={<AccountTreeIcon />}
                      label="For leagues, clubs, and associations"
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                    <Typography variant="h3" component="h2" gutterBottom>
                      League &amp; Club
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: PROSE_WIDTH }}>
                      Everything a multi-team organization needs to run a season — and the tier that funds the free team plan.
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: { xs: 'left', md: 'right' }, flexShrink: 0 }}>
                    <Typography variant="h3" component="p">
                      Let&apos;s talk
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pricing set with design-partner clubs
                    </Typography>
                  </Box>
                </Stack>
                <Divider sx={{ my: 3 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
                  {leagueFeatures.map((feature) => (
                    <Stack key={feature} direction="row" spacing={1.5} alignItems="center">
                      <CheckCircleIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                      <Typography variant="body1">{feature}</Typography>
                    </Stack>
                  ))}
                </Box>
                <Box sx={{ mt: 3 }}>
                  <CTAButton
                    href="/contact"
                    variant="outlined"
                    size="large"
                    trackingAction="pricing_league_contact_click"
                    trackingLabel="pricing_league_tier"
                  >
                    Talk to us about your league or club
                  </CTAButton>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Container>
      </Box>

      {/* What's included, free + Our commitments */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.default', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" gutterBottom>
            Free, and honest about it
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: PROSE_WIDTH }}>
            Here is exactly what teams get for free, and the commitments we make to keep it that way.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom>
            What&apos;s included, free
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 1.5,
              mb: 4,
            }}
          >
            {includedFeatures.map((feature) => (
              <Stack key={feature.title} direction="row" spacing={1.5} alignItems="center">
                <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18 }} />
                <Typography variant="body1">{feature.title}</Typography>
              </Stack>
            ))}
          </Box>

          <Typography variant="h6" component="h3" gutterBottom>
            Our commitments
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
            {commitments.map((commitment) => {
              const Icon = commitment.icon;
              return (
                <Card key={commitment.title}>
                  <CardContent>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Icon sx={{ color: 'text.secondary', fontSize: 22, mt: 0.25 }} />
                      <Box>
                        <Typography variant="subtitle1" component="h4" gutterBottom>
                          {commitment.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {commitment.description}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Container>
      </Box>

      {/* FAQ */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.paper', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" sx={{ mb: 3 }}>
            Pricing FAQ
          </Typography>
          <Stack spacing={3} sx={{ maxWidth: PROSE_WIDTH }}>
            {faqs.map((faq) => (
              <Box key={faq.question}>
                <Typography variant="h6" component="h3" gutterBottom>
                  {faq.question}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {faq.answer}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* Final CTA */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.default', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" gutterBottom>
            Ready to organize your team?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Create your account, set up a team, and invite drivers in minutes.
          </Typography>
          <CTAButton
            href="/signup"
            variant="contained"
            size="large"
            trackingAction="pricing_get_started_click"
            trackingLabel="pricing_final_cta"
          >
            Get Started Free
          </CTAButton>
        </Container>
      </Box>
    </>
  );
}
