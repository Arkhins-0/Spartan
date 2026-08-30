"use client";

// Replaces the root layout when it (or the theme providers) crash, so it must
// render its own <html>/<body> and stay free of MUI/Emotion dependencies. The
// colours below are the Console tokens (lib/theme.ts / app/globals.css)
// written out by hand, with a prefers-color-scheme block so the crash screen
// follows the visitor's scheme like the rest of the app.
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

const STYLES = `
  :root { --bg: #F2F2F2; --card: #FFFFFF; --fg: #1A1A1A; --muted: #6B6B6B; --line: rgba(0,0,0,0.10); --btn: #1A1A1A; --btn-fg: #FFFFFF; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #212121; --card: #2C2C2C; --fg: #FBFBFB; --muted: #ADADAD; --line: rgba(255,255,255,0.10); --btn: #F7D619; --btn-fg: #1A1A1A; }
  }
  .ol-crash-btn:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
  .ol-crash-btn:active { transform: scale(0.97); }
`;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          color: "var(--fg)",
          fontFamily:
            '"IBM Plex Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        <div
          role="alert"
          style={{
            maxWidth: 480,
            width: "100%",
            margin: 16,
            padding: 24,
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderLeft: "3px solid #C62828",
            borderRadius: 8,
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            Spartan
          </p>
          <h1 style={{ margin: "0 0 8px", fontSize: 20, lineHeight: 1.3, fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 20px", fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>
            We hit an unexpected error and couldn&apos;t load the app. Try again, and if the
            problem persists, come back in a few minutes.
          </p>
          <button
            type="button"
            className="ol-crash-btn"
            onClick={reset}
            style={{
              minHeight: 44,
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              color: "var(--btn-fg)",
              background: "var(--btn)",
              border: "1px solid transparent",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
