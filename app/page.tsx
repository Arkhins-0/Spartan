"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import HeroSection from "@/components/features/marketing/HeroSection";
import FeaturesPreview from "@/components/features/marketing/FeaturesPreview";
import ProblemSolutionSection from "@/components/features/marketing/ProblemSolutionSection";
import HowItWorks from "@/components/features/marketing/HowItWorks";
import SocialProofSection from "@/components/features/marketing/SocialProofSection";
import FinalCTA from "@/components/features/marketing/FinalCTA";
import { useScrollTracking } from "@/lib/hooks/useScrollTracking";
import StructuredData from "@/components/ui/StructuredData";
import { getBreadcrumbSchema } from "@/lib/config/seo";

/**
 * Root Landing Page
 * - Shows marketing landing page for unauthenticated users
 * - Redirects authenticated users to dashboard
 * - Client Component to prevent hydration mismatches
 */
export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Track scroll engagement for analytics
  useScrollTracking();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (session?.user) {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <Box
        sx={{
          flexGrow: 1,
          minHeight: "40vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Don't render anything if user is authenticated (will redirect)
  if (session?.user) {
    return null;
  }

  // Unauthenticated user - show marketing landing page with header/footer
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
  ]);

  // The sections are built from Console tokens and alternate between the page
  // and card surfaces, so they follow the visitor's scheme — no light pin.
  return (
    <>
      <StructuredData data={breadcrumbSchema} />
      <HeroSection />
      <ProblemSolutionSection />
      <FeaturesPreview />
      <HowItWorks />
      <SocialProofSection />
      <FinalCTA />
    </>
  );
}
