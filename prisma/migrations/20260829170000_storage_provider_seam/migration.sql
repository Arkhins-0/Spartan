-- Object storage seam (lib/storage): rows remember which provider holds their
-- bytes so S3 can be introduced alongside existing Vercel Blob uploads.
-- Existing rows hold full blob URLs, hence the 'vercel-blob' default.

ALTER TABLE "documents" RENAME COLUMN "blobPathname" TO "storageKey";
ALTER TABLE "documents" ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'vercel-blob';

ALTER TABLE "event_media_items" RENAME COLUMN "blobPathname" TO "storageKey";
ALTER TABLE "event_media_items" ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'vercel-blob';
