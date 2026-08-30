-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "HpProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "centralName" TEXT,
    "projectYear" INTEGER,
    "lastImportId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HpBuilding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectRefId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uavt" TEXT,
    "district" TEXT,
    "neighborhood" TEXT,
    "street" TEXT,
    "buildingName" TEXT,
    "doorNumber" TEXT,
    "bbkHp" INTEGER NOT NULL DEFAULT 0,
    "pstn" INTEGER,
    "dsl" INTEGER,
    "infrastructureStatus" TEXT,
    "workProgressDate" DATETIME,
    "rekorDate" DATETIME,
    "equivalentBuildingCode" TEXT,
    "csbmCode" TEXT,
    "cableCompleted" BOOLEAN NOT NULL DEFAULT false,
    "cableCompletedAt" DATETIME,
    "spliceCompleted" BOOLEAN NOT NULL DEFAULT false,
    "spliceCompletedAt" DATETIME,
    "ibkCompleted" BOOLEAN NOT NULL DEFAULT false,
    "ibkCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HpBuilding_projectRefId_fkey" FOREIGN KEY ("projectRefId") REFERENCES "HpProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HpBuildingNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buildingId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HpBuildingNote_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "HpBuilding" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HpBuildingNote_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HpBuildingHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buildingId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "description" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HpBuildingHistory_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "HpBuilding" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HpBuildingHistory_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HpExcelImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedBy" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRows" INTEGER NOT NULL,
    "newProjects" INTEGER NOT NULL DEFAULT 0,
    "newBuildings" INTEGER NOT NULL DEFAULT 0,
    "updatedBuildings" INTEGER NOT NULL DEFAULT 0,
    "archivedBuildings" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "errorReport" TEXT,
    CONSTRAINT "HpExcelImport_importedBy_fkey" FOREIGN KEY ("importedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductionImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "workDate" DATETIME NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "totalTeams" INTEGER NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "unknownItems" INTEGER NOT NULL,
    "importedBy" TEXT NOT NULL,
    CONSTRAINT "ProductionImport_importedBy_fkey" FOREIGN KEY ("importedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductionEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "workDate" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "subtype" TEXT,
    "cableCapacity" INTEGER,
    "cableFamily" TEXT,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductionEntry_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ProductionImport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductionEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "HpProject_centralName_projectYear_idx" ON "HpProject"("centralName", "projectYear");

-- CreateIndex
CREATE UNIQUE INDEX "HpProject_projectId_projectType_key" ON "HpProject"("projectId", "projectType");

-- CreateIndex
CREATE INDEX "HpBuilding_uavt_idx" ON "HpBuilding"("uavt");

-- CreateIndex
CREATE INDEX "HpBuilding_district_neighborhood_street_doorNumber_idx" ON "HpBuilding"("district", "neighborhood", "street", "doorNumber");

-- CreateIndex
CREATE UNIQUE INDEX "HpBuilding_projectRefId_sourceKey_key" ON "HpBuilding"("projectRefId", "sourceKey");

-- CreateIndex
CREATE INDEX "HpBuildingNote_buildingId_createdAt_idx" ON "HpBuildingNote"("buildingId", "createdAt");

-- CreateIndex
CREATE INDEX "HpBuildingHistory_buildingId_createdAt_idx" ON "HpBuildingHistory"("buildingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Team_normalizedName_key" ON "Team"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionImport_fingerprint_key" ON "ProductionImport"("fingerprint");

-- CreateIndex
CREATE INDEX "ProductionImport_workDate_idx" ON "ProductionImport"("workDate");

-- CreateIndex
CREATE INDEX "ProductionEntry_workDate_teamId_idx" ON "ProductionEntry"("workDate", "teamId");

-- CreateIndex
CREATE INDEX "ProductionEntry_category_subtype_idx" ON "ProductionEntry"("category", "subtype");

-- CreateIndex
CREATE INDEX "ProductionEntry_cableFamily_cableCapacity_idx" ON "ProductionEntry"("cableFamily", "cableCapacity");
