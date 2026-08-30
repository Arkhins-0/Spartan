import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { withSentryConfig } from "@sentry/nextjs";

const gaEnabled = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim());
const sentryEnabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN?.trim());

const scriptSrc = [
  "'self'",
  "'unsafe-eval'",
  "'unsafe-inline'",
  "https://cloud.umami.is",
  ...(gaEnabled ? ["https://www.googletagmanager.com"] : []),
  "https://vercel.live",
];

// Object storage origins (lib/storage). Uploads PUT straight from the browser
// (connect-src) and galleries/documents render from signed URLs (img-src,
// media-src), so both providers' hosts must be allowed. The S3 origin is
// derived the same way the SDK derives it, at build time.
function s3Origins(): string[] {
  const bucket = process.env.S3_BUCKET?.trim();
  if (!bucket) return [];
  const endpoint = process.env.S3_ENDPOINT?.trim();
  if (endpoint) {
    try {
      const url = new URL(endpoint);
      // Path-style (MinIO) uses the endpoint itself; virtual-hosted (R2, B2)
      // prefixes the bucket. Allow both rather than guess.
      return [url.origin, `${url.protocol}//${bucket}.${url.host}`];
    } catch {
      return [];
    }
  }
  const region = process.env.S3_REGION?.trim() || process.env.AWS_REGION?.trim() || "us-east-1";
  return [`https://${bucket}.s3.${region}.amazonaws.com`];
}
const storageOrigins = ["https://*.public.blob.vercel-storage.com", ...s3Origins()];

const imgSrc = [
  "'self'",
  "data:",
  "blob:",
  ...storageOrigins,
  ...(gaEnabled ? ["https://www.google-analytics.com", "https://*.google-analytics.com"] : []),
];

const mediaSrc = ["'self'", "blob:", ...storageOrigins];

const connectSrc = [
  "'self'",
  ...storageOrigins,
  "https://cloud.umami.is",
  "https://api-gateway.umami.dev",
  ...(sentryEnabled ? ["https://*.ingest.sentry.io", "https://*.ingest.us.sentry.io", "https://*.ingest.de.sentry.io"] : []),
  ...(gaEnabled ? ["https://www.google-analytics.com", "https://*.google-analytics.com", "https://region1.google-analytics.com"] : []),
];

const frameSrc = [
  "'self'",
];

const PUBLIC_ASSET_CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=31536000";
const REVALIDATING_CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";
const SERVICE_WORKER_CACHE_CONTROL = "public, max-age=0, must-revalidate";
const cacheControlHeader = (value: string) => [
  {
    key: "Cache-Control",
    value,
  },
];
const staticIconSources = [
  "/favicon.ico",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/apple-touch-icon.png",
];

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  // Dev-only: Next 16 blocks cross-origin requests to dev assets, and treats
  // any host other than the one the server booted on (localhost) as foreign —
  // so hitting the dev server by IP returns 403 for every /_next chunk and the
  // page loads unhydrated. Allowing loopback + private ranges lets you test on
  // a phone over the LAN, which matters for a mobile-first UI. No effect on a
  // production build.
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*"],
  compiler: {
    emotion: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 604800,
  },
  modularizeImports: {
    "@mui/material": {
      transform: "@mui/material/{{member}}",
    },
    "@mui/icons-material": {
      transform: "@mui/icons-material/{{member}}",
    },
  },
  // Security headers (Requirement 10.6)
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: cacheControlHeader(PUBLIC_ASSET_CACHE_CONTROL),
      },
      ...staticIconSources.map((source) => ({
        source,
        headers: cacheControlHeader(PUBLIC_ASSET_CACHE_CONTROL),
      })),
      {
        source: "/site.webmanifest",
        headers: cacheControlHeader(REVALIDATING_CACHE_CONTROL),
      },
      {
        source: "/offline.html",
        headers: cacheControlHeader(REVALIDATING_CACHE_CONTROL),
      },
      {
        source: "/sw.js",
        headers: cacheControlHeader(SERVICE_WORKER_CACHE_CONTROL),
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src ${scriptSrc.join(" ")}`,
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com", // MUI requires unsafe-inline
              "font-src 'self' fonts.gstatic.com",
              `img-src ${imgSrc.join(" ")}`,
              `media-src ${mediaSrc.join(" ")}`,
              `connect-src ${connectSrc.join(" ")}`,
              `frame-src ${frameSrc.join(" ")}`,
              "worker-src 'self'",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

const withMDX = createMDX({});

// Sentry is fully inert without env config: no DSN → no runtime init (see
// sentry.*.config.ts / instrumentation-client.ts), no auth token → no source-map
// upload. The wrapper itself is safe to apply unconditionally.
export default withSentryConfig(withMDX(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  disableLogger: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
