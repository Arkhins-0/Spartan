---
schemaVersion: 0.1.0
id: "0010"
title: "Access object storage through a provider seam"
status: proposed
date: 2026-08-29
created: 2026-08-29
deciders: []
tags: [architecture, storage, portability, security, self-hosting]
scope: org
reversibility: two-way-door
blastRadius: component
relatesTo: ["0002", "0003", "0008"]
affects:
  - type: path
    pattern: "lib/storage/**"
    note: The seam. Application code imports from here, never from a storage SDK.
  - type: path
    pattern: "lib/actions/documents.ts"
    note: Stores a (provider, key) pair and mints read URLs per request.
  - type: path
    pattern: "lib/actions/event-media.ts"
    note: Stores a (provider, key) pair and mints read URLs per request.
  - type: path
    pattern: "app/api/**/upload/route.ts"
    note: Grant routes authorize, then delegate to handleUploadGrantRequest.
  - type: path
    pattern: "lib/env.ts"
    note: STORAGE_PROVIDER / S3_* / BLOB_READ_WRITE_TOKEN are optional and inferred.
  - type: path
    pattern: "prisma/schema.prisma"
    note: Uploaded objects are referenced by storageProvider + storageKey, never a URL.
  - type: path
    pattern: "next.config.ts"
    note: CSP allows the configured storage origins for direct-to-storage uploads.
provenance:
  authoredBy: agent-drafted
  sourceArtifact: .design-sync/conventions.md
review:
  tier: async
  tierReason: >-
    Changes where user-uploaded paperwork lives and how it is protected;
    needs a human to confirm the privacy model and the bucket policy.
reviewBy: 2027-08-29
---

# ADR-0010: Access object storage through a provider seam

## Context

Spartan stores two kinds of user-uploaded files: association paperwork
(entry forms, medical certificates, scrutineering and results sheets — filed
by admins, visible only to the association and the team concerned) and
signup-event media (participant photos and videos, participants-only by
default). Both were written straight against Vercel Blob: the actions imported
`@vercel/blob`, the token-exchange routes used its client protocol, the rows
stored a full public blob URL, and that URL was handed to the browser as-is.

Three forces made this a decision rather than a preference:

1. **Privacy.** The schema comments promised "private blobs, delivered via
   short-lived signed URLs after an authorization check" but no such code
   existed. Every stored URL was public-but-unguessable, so a medical
   certificate was one forwarded link away from anyone. Paperwork of this
   kind needs a read path that expires and is minted only after the same
   authorization the listing enforces.
2. **Portability.** ADR-0008 commits the association core to being
   provider-portable and self-hostable, and records media as the one area
   still tied to a single provider. A self-hoster on bare Postgres cannot use
   Vercel Blob; they can run MinIO, R2, B2 or S3 itself.
3. **Upload size.** Vercel's serverless functions reject bodies over ~4.5 MB,
   so uploads must go browser-to-storage directly, which is a provider-specific
   protocol (presigned PUT for S3, token exchange for Blob) that the UI must
   not have to know about.

## Decision

We will access object storage exclusively through a provider seam in
`lib/storage/`, modelled on the email seam in `lib/email/` (ADR-0008):

- Application code calls `createUploadGrant`, `resolveUploadedRef`,
  `getReadUrl` and `deleteObjectBestEffort`; it never imports a storage SDK.
  The browser calls `uploadToStorage()` from `lib/storage/client` and never
  learns which provider is behind it.
- Rows persist a **(storageProvider, storageKey)** pair, never a URL. Read
  URLs are minted per request. On S3 the bucket is private and the URL is a
  short-lived presigned GET; on Vercel Blob the "key" is the capability URL.
- The provider is selected by `STORAGE_PROVIDER` (`s3` | `vercel-blob` |
  `none`) or inferred from credentials (`S3_BUCKET` → s3, then
  `BLOB_READ_WRITE_TOKEN` → vercel-blob). With neither configured, uploads
  are disabled and fail visibly (ADR-0008's provider-absence rule). An
  explicitly selected provider without its credentials fails at boot.
- S3 is the recommended provider. Uploads are presigned PUTs whose signature
  pins Content-Type and Content-Length; keys are server-generated UUIDs whose
  extension derives from the declared MIME type, never the filename; any
  S3-compatible endpoint (`S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`) is supported.
- Vercel Blob remains a selectable provider so existing deployments keep
  every object they already hold; rows remember their provider, so switching
  never strands earlier uploads while both are configured.

## Options considered

### Option A: Provider seam with S3 (private, signed reads) and Vercel Blob (chosen)

| Dimension | Assessment |
|---|---|
| Privacy of paperwork | Private bucket + per-request signed GETs; the link in the page dies with the session |
| Portability | Any S3-compatible store; nothing in application code names a vendor |
| Existing data | Untouched — rows default to `vercel-blob` and keep serving |
| Upload size | Direct-to-storage on both providers; no serverless body limit |
| Cost | Two providers to keep working; signed URLs add a few ms per listed item |

### Option B: Stay on Vercel Blob, add its private-access mode

**Pros:** One provider; smaller diff; Vercel's own signed-URL support.
**Cons:** Leaves the association core tied to a proprietary provider, which
ADR-0008 explicitly names as the remaining gap; self-hosters still cannot
store paperwork at all; the schema still stores a URL rather than a key.

### Option C: Migrate to S3 only and drop Vercel Blob

**Pros:** One provider, one privacy model, no `(provider, key)` pair.
**Cons:** Requires copying every existing object into a bucket before
deploy, and forces hosted users who chose Blob for its Vercel integration to
provision AWS credentials on day one. Reversible later by deleting the Blob
provider once nothing references it.

### Option D: Do nothing

Leaves medical certificates reachable by link and media un-self-hostable.
Rejected for the privacy reason alone.

## Trade-offs

- Two providers means two code paths to test; the Blob path is exercised
  through its real reference validation in the action tests, the S3 path
  through the presigner in `__tests__/lib/storage/providers.test.ts`.
- Signed read URLs cannot be cached by a CDN or shared; a gallery of 200
  photos signs 200 URLs per page view (local HMAC, sub-millisecond each).
  Public galleries that want CDN delivery would need a public prefix — an
  explicit later decision, not something this seam does silently.
- A presigned PUT pins length and type but cannot inspect bytes; a client
  that lies about `Content-Type` is limited to the MIME allowlist, and the
  object is still served under that type. Virus scanning is out of scope.
- The CSP must name the storage origin, which is derived from env at build
  time; a mis-set `S3_ENDPOINT` shows up as a blocked upload, not a 500.

## Consequences

- Easier: self-hosting with paperwork; adding another provider (a new file
  implementing `StorageProvider`); reasoning about who can read a file (the
  same check as who can list it).
- Harder: sharing a permanent link to an uploaded file — by design.
- **How we would know this was wrong:** a second provider seam proves
  necessary for a use the interface cannot express (e.g. multipart uploads
  over 5 GB, or public CDN delivery) and the workaround is application code
  importing an SDK directly; or signed-URL minting shows up in request
  timing for gallery pages.
- Revisit if: Vercel Blob gains a first-class private mode that makes the
  provider pair redundant, or when no row with `storageProvider = 'vercel-blob'`
  remains and the Blob provider can be deleted.

## Action items

1. [ ] Document the S3 bucket policy and CORS rule in DEPLOYMENT.md.
2. [ ] Decide whether public signup-event galleries get a public/CDN prefix.
3. [ ] Add provider-absence acceptance tests alongside ADR-0008's.
