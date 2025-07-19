/*
  Warnings:

  - You are about to drop the `RecentActivity` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('ProjectCreated', 'ProjectUpdated', 'ProjectDeleted', 'ScanStarted', 'ScanCompleted', 'ScanFailed', 'UserAdded', 'UserRemoved', 'UserInvited', 'SecurityIssueFound', 'AccessibilityIssueFound', 'SEOIssueFound', 'System', 'Export', 'Import');

-- CreateEnum
CREATE TYPE "ActivityPriority" AS ENUM ('Low', 'Medium', 'High', 'Critical', 'Urgent');

-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('Project', 'Scan', 'Security', 'Accessibility', 'SEO', 'User', 'Organization', 'System', 'Export', 'Import');

-- DropForeignKey
ALTER TABLE "RecentActivity" DROP CONSTRAINT "RecentActivity_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "RecentActivity" DROP CONSTRAINT "RecentActivity_projectId_fkey";

-- DropForeignKey
ALTER TABLE "RecentActivity" DROP CONSTRAINT "RecentActivity_scanId_fkey";

-- DropTable
DROP TABLE "RecentActivity";

-- CreateTable
CREATE TABLE "recent_activities" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "priority" "ActivityPriority" NOT NULL,
    "category" "ActivityCategory" NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT,
    "scanId" TEXT,
    "userId" TEXT,
    "notificationRules" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recent_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RecentActivityToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RecentActivityToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_RecentActivityToUser_B_index" ON "_RecentActivityToUser"("B");

-- AddForeignKey
ALTER TABLE "recent_activities" ADD CONSTRAINT "recent_activities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recent_activities" ADD CONSTRAINT "recent_activities_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recent_activities" ADD CONSTRAINT "recent_activities_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recent_activities" ADD CONSTRAINT "recent_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RecentActivityToUser" ADD CONSTRAINT "_RecentActivityToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "recent_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RecentActivityToUser" ADD CONSTRAINT "_RecentActivityToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
