-- AlterTable
ALTER TABLE "scan_results" ADD COLUMN     "criticalIssues" INTEGER,
ADD COLUMN     "minorIssues" INTEGER,
ADD COLUMN     "moderateIssues" INTEGER,
ADD COLUMN     "seriousIssues" INTEGER,
ADD COLUMN     "totalIssues" INTEGER;
