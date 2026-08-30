-- AlterEnum
ALTER TYPE "Sport" ADD VALUE 'MOTORSPORT';

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "carNumber" INTEGER,
ADD COLUMN     "fmsciLicenseNumber" VARCHAR(30),
ADD COLUMN     "racingClass" VARCHAR(50);
