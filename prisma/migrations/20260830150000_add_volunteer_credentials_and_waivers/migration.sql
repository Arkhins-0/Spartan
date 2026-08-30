-- CreateEnum
CREATE TYPE "VolunteerCredentialKind" AS ENUM ('MARSHAL_GRADE', 'LICENCE', 'FIRST_AID', 'SCRUTINEER', 'TRAINING');

-- AlterTable
ALTER TABLE "volunteer_assignments" ADD COLUMN     "credentialWaivedAt" TIMESTAMP(3),
ADD COLUMN     "credentialWaivedById" TEXT;

-- AlterTable
ALTER TABLE "volunteer_needs" ADD COLUMN     "requiredCredentialKind" "VolunteerCredentialKind",
ADD COLUMN     "requiredCredentialLabel" TEXT;

-- CreateTable
CREATE TABLE "round_waivers" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roundId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "round_waivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_waiver_acceptances" (
    "id" TEXT NOT NULL,
    "waiverVersion" INTEGER NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "acceptedByName" TEXT,
    "acceptedByEmail" TEXT,
    "waiverId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "round_waiver_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_credentials" (
    "id" TEXT NOT NULL,
    "kind" "VolunteerCredentialKind" NOT NULL,
    "label" TEXT NOT NULL,
    "reference" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "recordedById" TEXT,

    CONSTRAINT "volunteer_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "round_waivers_roundId_key" ON "round_waivers"("roundId");

-- CreateIndex
CREATE INDEX "round_waiver_acceptances_waiverId_acceptedAt_idx" ON "round_waiver_acceptances"("waiverId", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "round_waiver_acceptances_waiverId_userId_waiverVersion_key" ON "round_waiver_acceptances"("waiverId", "userId", "waiverVersion");

-- CreateIndex
CREATE INDEX "volunteer_credentials_leagueId_userId_idx" ON "volunteer_credentials"("leagueId", "userId");

-- CreateIndex
CREATE INDEX "volunteer_credentials_leagueId_kind_expiresAt_idx" ON "volunteer_credentials"("leagueId", "kind", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_credentials_leagueId_userId_kind_label_key" ON "volunteer_credentials"("leagueId", "userId", "kind", "label");

-- AddForeignKey
ALTER TABLE "round_waivers" ADD CONSTRAINT "round_waivers_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "race_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_waivers" ADD CONSTRAINT "round_waivers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_waiver_acceptances" ADD CONSTRAINT "round_waiver_acceptances_waiverId_fkey" FOREIGN KEY ("waiverId") REFERENCES "round_waivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_waiver_acceptances" ADD CONSTRAINT "round_waiver_acceptances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_credentials" ADD CONSTRAINT "volunteer_credentials_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_credentials" ADD CONSTRAINT "volunteer_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_credentials" ADD CONSTRAINT "volunteer_credentials_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_credentials" ADD CONSTRAINT "volunteer_credentials_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_credentialWaivedById_fkey" FOREIGN KEY ("credentialWaivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- A credential that expired before it was issued is a data-entry slip, and it
-- would silently fail every gate it is checked against.
ALTER TABLE "volunteer_credentials"
  ADD CONSTRAINT "volunteer_credentials_validity_check"
  CHECK ("expiresAt" IS NULL OR "issuedAt" IS NULL OR "expiresAt" > "issuedAt");

-- A published waiver has wording; an unpublished draft may not.
ALTER TABLE "round_waivers"
  ADD CONSTRAINT "round_waivers_published_has_body_check"
  CHECK ("publishedAt" IS NULL OR length(btrim("body")) > 0);

-- The waived-by actor and the moment travel together, or the record cannot say
-- who allowed the exception.
ALTER TABLE "volunteer_assignments"
  ADD CONSTRAINT "volunteer_assignments_credential_waiver_check"
  CHECK (num_nonnulls("credentialWaivedAt", "credentialWaivedById") <> 1);

-- One acceptance per person per version, including the anonymous case that the
-- compound unique cannot address because Postgres treats NULLs as distinct.
CREATE UNIQUE INDEX "round_waiver_acceptances_anonymous_version_key"
  ON "round_waiver_acceptances" ("waiverId", "acceptedByEmail", "waiverVersion")
  WHERE "userId" IS NULL AND "acceptedByEmail" IS NOT NULL;
