-- DropIndex
DROP INDEX "scan_results_url_message_element_scanType_idx";

-- AlterTable
ALTER TABLE "scan_results" ADD COLUMN     "issueHash" TEXT;

-- CreateIndex
CREATE INDEX "scan_results_issueHash_idx" ON "scan_results"("issueHash");
