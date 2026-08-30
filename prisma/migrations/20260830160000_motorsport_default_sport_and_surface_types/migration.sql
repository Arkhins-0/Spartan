-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SurfaceType" ADD VALUE 'CIRCUIT';
ALTER TYPE "SurfaceType" ADD VALUE 'TRACK';
ALTER TYPE "SurfaceType" ADD VALUE 'PADDOCK';

-- AlterTable
ALTER TABLE "Team" ALTER COLUMN "sport" SET DEFAULT 'MOTORSPORT';

-- AlterTable
ALTER TABLE "leagues" ALTER COLUMN "sport" SET DEFAULT 'MOTORSPORT';
