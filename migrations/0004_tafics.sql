-- Additive, isolated module: no existing tables or records are changed.
CREATE TABLE "TaficsProject" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "province" TEXT NOT NULL CHECK(length(trim("province")) > 0),
  "projectName" TEXT NOT NULL CHECK(length(trim("projectName")) > 0),
  "projectType" TEXT NOT NULL DEFAULT 'TAFICS',
  "underground" REAL NOT NULL DEFAULT 0 CHECK("underground" >= 0 AND "underground" <= 1000000000000),
  "cable" REAL NOT NULL DEFAULT 0 CHECK("cable" >= 0 AND "cable" <= 1000000000000),
  "horizontalDrilling" REAL NOT NULL DEFAULT 0 CHECK("horizontalDrilling" >= 0 AND "horizontalDrilling" <= 1000000000000),
  "permissionStatus" TEXT NOT NULL DEFAULT 'ALINMADI' CHECK("permissionStatus" IN ('ALINDI','DEVAM EDİYOR','ALINMADI')),
  "completionStatus" TEXT NOT NULL DEFAULT 'BAŞLAMADI' CHECK("completionStatus" IN ('TAMAMLANDI','DEVAM EDİYOR','BAŞLAMADI')),
  "description" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "TaficsProject_province_projectType_idx" ON "TaficsProject"("province","projectType");
