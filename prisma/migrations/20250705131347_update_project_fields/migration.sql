-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('Active', 'Scanning', 'Warning', 'Error', 'Paused');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "criticalIssues" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "highIssues" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastScanAt" TIMESTAMP(3),
ADD COLUMN     "lowIssues" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mediumIssues" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nextScanAt" TIMESTAMP(3),
ADD COLUMN     "scores" JSONB,
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'Active',
ADD COLUMN     "totalIssues" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "projects_organizationId_idx" ON "projects"("organizationId");

-- CreateIndex
CREATE INDEX "projects_ownerId_idx" ON "projects"("ownerId");

-- CreateIndex
CREATE INDEX "projects_lastScanAt_idx" ON "projects"("lastScanAt");

-- CreateIndex
CREATE INDEX "projects_totalIssues_idx" ON "projects"("totalIssues");
