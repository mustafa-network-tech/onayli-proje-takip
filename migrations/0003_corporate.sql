CREATE TABLE "CorporateImport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fileName" TEXT NOT NULL,
  "totalRows" INTEGER NOT NULL,
  "importedBy" TEXT NOT NULL,
  "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "CorporateProject" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "district" TEXT,
  "address" TEXT,
  "centralName" TEXT,
  "drawingName" TEXT,
  "projectFeature" TEXT,
  "approvalStatus" TEXT,
  "cableCompleted" BOOLEAN NOT NULL DEFAULT false,
  "spliceCompleted" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT NOT NULL DEFAULT '',
  "districtEdited" BOOLEAN NOT NULL DEFAULT false,
  "addressEdited" BOOLEAN NOT NULL DEFAULT false,
  "lastImportId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "CorporateProject_projectId_key" ON "CorporateProject"("projectId");
CREATE INDEX "CorporateProject_district_idx" ON "CorporateProject"("district");
