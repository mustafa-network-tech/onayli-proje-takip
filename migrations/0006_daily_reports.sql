-- Additive, isolated module: no existing table is altered and nothing references
-- HpProject/HpBuilding by foreign key (Excel re-imports recreate those rows).
-- Items are snapshots; a finalized report is immutable at the database level.
CREATE TABLE "DailyReport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK("status" IN ('DRAFT','FINAL')),
  "reportDate" TEXT CHECK("reportDate" IS NULL OR "reportDate" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  "sequence" INTEGER CHECK("sequence" IS NULL OR "sequence" >= 0),
  "title" TEXT,
  "totalBuildings" INTEGER,
  "completedBuildings" INTEGER,
  "completedHp" INTEGER,
  "problemBuildings" INTEGER,
  "problemHp" INTEGER,
  "cancelledBuildings" INTEGER,
  "cancelledHp" INTEGER,
  "finalizedAt" INTEGER,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  CHECK(("status"='DRAFT' AND "reportDate" IS NULL AND "sequence" IS NULL AND "finalizedAt" IS NULL)
     OR ("status"='FINAL' AND "reportDate" IS NOT NULL AND "sequence" IS NOT NULL AND "title" IS NOT NULL
         AND "totalBuildings" > 0 AND "finalizedAt" IS NOT NULL))
);
-- At most one draft can exist, enforced by the database for concurrent requests.
CREATE UNIQUE INDEX "DailyReport_single_draft" ON "DailyReport"("status") WHERE "status"='DRAFT';
CREATE UNIQUE INDEX "DailyReport_date_sequence" ON "DailyReport"("reportDate","sequence") WHERE "reportDate" IS NOT NULL;

CREATE TABLE "DailyReportItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reportId" TEXT NOT NULL,
  "projectType" TEXT NOT NULL CHECK("projectType" IN ('GF','BF')),
  "projectId" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "buildingRefId" TEXT,
  "neighborhood" TEXT NOT NULL DEFAULT '',
  "address" TEXT NOT NULL DEFAULT '',
  "hp" INTEGER NOT NULL DEFAULT 0 CHECK("hp" >= 0),
  "status" TEXT NOT NULL CHECK("status" IN ('COMPLETED','PROBLEM','CANCELLED')),
  "note" TEXT NOT NULL DEFAULT '' CHECK(length("note") <= 1000),
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  CONSTRAINT "DailyReportItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DailyReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CHECK("status"='COMPLETED' OR length(trim("note")) > 0)
);
-- The same source building cannot be in one report twice; other reports may reuse it.
CREATE UNIQUE INDEX "DailyReportItem_report_building" ON "DailyReportItem"("reportId","projectType","projectId","sourceKey");
CREATE INDEX "DailyReportItem_reportId_idx" ON "DailyReportItem"("reportId");

CREATE TRIGGER "DailyReport_final_no_update" BEFORE UPDATE ON "DailyReport"
WHEN OLD."status"='FINAL'
BEGIN SELECT RAISE(ABORT, 'Kesinleşmiş rapor değiştirilemez.'); END;

CREATE TRIGGER "DailyReport_final_no_delete" BEFORE DELETE ON "DailyReport"
WHEN OLD."status"='FINAL'
BEGIN SELECT RAISE(ABORT, 'Kesinleşmiş rapor silinemez.'); END;

CREATE TRIGGER "DailyReportItem_final_no_insert" BEFORE INSERT ON "DailyReportItem"
WHEN (SELECT "status" FROM "DailyReport" WHERE "id"=NEW."reportId")='FINAL'
BEGIN SELECT RAISE(ABORT, 'Kesinleşmiş rapora bina eklenemez.'); END;

CREATE TRIGGER "DailyReportItem_final_no_update" BEFORE UPDATE ON "DailyReportItem"
WHEN (SELECT "status" FROM "DailyReport" WHERE "id"=OLD."reportId")='FINAL'
BEGIN SELECT RAISE(ABORT, 'Kesinleşmiş rapor değiştirilemez.'); END;

CREATE TRIGGER "DailyReportItem_final_no_delete" BEFORE DELETE ON "DailyReportItem"
WHEN (SELECT "status" FROM "DailyReport" WHERE "id"=OLD."reportId")='FINAL'
BEGIN SELECT RAISE(ABORT, 'Kesinleşmiş rapor değiştirilemez.'); END;
