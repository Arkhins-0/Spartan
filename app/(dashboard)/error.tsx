"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { LinkButton } from "@/components/ui/NextLinkComposites";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route error:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorPanel
      digest={error.digest}
      onRetry={reset}
      actions={
        <LinkButton href="/dashboard" variant="outlined">
          Back to dashboard
        </LinkButton>
      }
    />
  );
}
