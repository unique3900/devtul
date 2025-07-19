-- AlterTable
ALTER TABLE "scan_results" ADD COLUMN     "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isResolved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedInScanId" TEXT;

-- CreateIndex
CREATE INDEX "scan_results_isResolved_idx" ON "scan_results"("isResolved");

-- CreateIndex
CREATE INDEX "scan_results_url_message_element_scanType_idx" ON "scan_results"("url", "message", "element", "scanType");

-- AddForeignKey
ALTER TABLE "scan_results" ADD CONSTRAINT "scan_results_resolvedInScanId_fkey" FOREIGN KEY ("resolvedInScanId") REFERENCES "scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
