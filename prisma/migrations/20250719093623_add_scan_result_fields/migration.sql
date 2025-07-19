-- AlterTable
ALTER TABLE "scan_results" ADD COLUMN     "category" TEXT,
ADD COLUMN     "scanType" "ScanType";

-- CreateIndex
CREATE INDEX "scan_results_scanType_idx" ON "scan_results"("scanType");

-- CreateIndex
CREATE INDEX "scan_results_category_idx" ON "scan_results"("category");
