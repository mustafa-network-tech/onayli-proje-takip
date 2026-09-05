CREATE TABLE "HpMonthlyCompletion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "projectType" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "uavt" TEXT,
  "district" TEXT,
  "neighborhood" TEXT,
  "street" TEXT,
  "buildingName" TEXT,
  "doorNumber" TEXT,
  "hp" INTEGER NOT NULL,
  "month" TEXT NOT NULL,
  "origin" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "HpMonthlyCompletion_projectType_projectId_sourceKey_key" ON "HpMonthlyCompletion"("projectType","projectId","sourceKey");
CREATE INDEX "HpMonthlyCompletion_month_projectType_idx" ON "HpMonthlyCompletion"("month","projectType");

-- Preserve currently completed buildings when introducing the module.
-- Existing completed rows belong to the month before this module is installed.
INSERT INTO "HpMonthlyCompletion"
  ("id","projectId","projectType","sourceKey","uavt","district","neighborhood","street","buildingName","doorNumber","hp","month","origin")
SELECT lower(hex(randomblob(16))),p."projectId",p."projectType",b."sourceKey",b."uavt",
  b."district",b."neighborhood",b."street",b."buildingName",b."doorNumber",b."bbkHp",
  strftime('%Y-%m', 'now', '+3 hours', 'start of month', '-1 month'), 'existing'
FROM "HpBuilding" b JOIN "HpProject" p ON p."id"=b."projectRefId"
WHERE b."isActive"=1 AND b."cableCompleted"=1 AND b."spliceCompleted"=1
  AND (p."projectType"='GF' OR (p."projectType"='BF' AND b."ibkCompleted"=1));
