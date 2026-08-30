import { Container, Box, Typography, Divider, Stack } from '@mui/material';
import { generatePageMetadata, getBreadcrumbSchema } from '@/lib/config/seo';
import StructuredData from '@/components/ui/StructuredData';
import {
  DraftNotice,
  CounselPlaceholder,
  LegalSection,
  LegalToc,
} from '@/components/features/legal/LegalScaffold';

export const metadata = generatePageMetadata({
  title: 'Terms of Service',
  description: 'Understand the basic terms for using the Spartan platform. Your rights and responsibilities as a user.',
  path: '/terms',
  noIndex: true, // Don't index draft legal pages until counsel-approved
});

const PROSE_WIDTH = '68ch';

const SECTIONS = [
  { id: 'acceptance', title: 'Acceptance of Terms' },
  { id: 'eligibility-accounts', title: 'Eligibility & Accounts' },
  { id: 'acceptable-use', title: 'Acceptable Use' },
  { id: 'user-content', title: 'User Content' },
  { id: 'payments-refunds', title: 'Payments & Refunds' },
  { id: 'intellectual-property', title: 'Intellectual Property' },
  { id: 'service-changes', title: 'Service Availability & Changes' },
  { id: 'disclaimers', title: 'Disclaimers' },
  { id: 'limitation-of-liability', title: 'Limitation of Liability' },
  { id: 'termination', title: 'Termination' },
  { id: 'governing-law', title: 'Governing Law & Disputes' },
  { id: 'contact', title: 'Contact Us' },
];

export default function TermsPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Terms of Service', url: '/terms' },
  ]);

  return (
    <>
      <StructuredData data={breadcrumbSchema} />

      {/* Page header */}
      <Box component="section" sx={{ bgcolor: 'background.default', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="md">
          <Typography variant="eyebrow" component="p" color="text.secondary" sx={{ mb: 1 }}>
            Legal
          </Typography>
          <Typography variant="sectionTitle" component="h1" sx={{ mb: 1.5 }}>
            Terms of Service
          </Typography>
          <Typography variant="marketingBody" component="p" color="text.secondary" sx={{ maxWidth: PROSE_WIDTH }}>
            Draft structure — July 2026 · final text pending legal review
          </Typography>
        </Container>
      </Box>

      {/* Terms body */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.paper', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="md">
          <Box sx={{ maxWidth: PROSE_WIDTH }}>
            <DraftNotice />
            <LegalToc items={SECTIONS} />

            <Stack spacing={5}>
              <LegalSection
                id="acceptance"
                title="Acceptance of Terms"
                covers="Will describe how using Spartan constitutes agreement to these terms and who may accept them on behalf of an organization."
              />

              <LegalSection
                id="eligibility-accounts"
                title="Eligibility & Accounts"
                covers="Will describe minimum-age requirements for account holders, account registration and email verification, and the account owner's responsibility for credentials and accurate information."
              />

              <LegalSection
                id="acceptable-use"
                title="Acceptable Use"
                covers="Will describe prohibited behavior: unlawful use, harassment, unauthorized access attempts, abuse of messaging features, and misuse of other members' personal information."
              />

              <LegalSection
                id="user-content"
                title="User Content"
                covers="Will describe ownership of content users add (rosters, schedules, messages, media), the license Spartan needs to operate the service, and responsibility for having permission to add other people's information."
              />

              <LegalSection
                id="payments-refunds"
                title="Payments & Refunds"
                covers="Will describe paid registrations processed through Stripe, refund handling, and the current free access to platform features (subject to prospective change)."
              />

              <LegalSection
                id="intellectual-property"
                title="Intellectual Property"
                covers="Will describe Spartan's rights in the software and branding, the open-source license terms (Apache License 2.0) that apply to the source code, and the trademark policy covering the Spartan name and logo (see TRADEMARKS.md)."
              />

              <LegalSection
                id="service-changes"
                title="Service Availability & Changes"
                covers="Will describe that Spartan is an early-stage service that may be modified, limited, or discontinued, how material changes will be communicated when practical, and the opportunity to export data before hosted access is discontinued."
              />

              <LegalSection
                id="disclaimers"
                title="Disclaimers"
                covers="Will describe the as-is basis of the service and disclaimers of warranties."
              />

              <LegalSection
                id="limitation-of-liability"
                title="Limitation of Liability"
                covers="Will describe the limits on Spartan's liability."
              />

              <LegalSection
                id="termination"
                title="Termination"
                covers="Will describe when accounts may be suspended or terminated, self-serve account deletion, and what happens to data on termination."
              />

              <LegalSection
                id="governing-law"
                title="Governing Law & Disputes"
                covers="Will describe the governing law and how disputes are resolved."
              />

              <LegalSection
                id="contact"
                title="Contact Us"
                covers="Questions about these terms can be sent to tech@ctrsports.in."
              >
                <CounselPlaceholder note="Formal notice/contact provisions to be provided by counsel" />
              </LegalSection>
            </Stack>

            <Divider sx={{ my: 5 }} />

            <Typography variant="body2" color="text.secondary">
              This page is a structural draft and does not constitute legal advice. The finalized,
              counsel-reviewed terms will replace it before public launch.
            </Typography>
          </Box>
        </Container>
      </Box>
    </>
  );
}
