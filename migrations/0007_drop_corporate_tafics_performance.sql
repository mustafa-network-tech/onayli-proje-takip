-- DESTRUCTIVE: removes the Kurumsal, TAFICS and Ekip Performansı modules' data.
-- Back up the database first (wrangler d1 export). Child tables are dropped first.
DROP TABLE IF EXISTS "ProductionEntry";
DROP TABLE IF EXISTS "ProductionImport";
DROP TABLE IF EXISTS "Team";
DROP TABLE IF EXISTS "CorporateProject";
DROP TABLE IF EXISTS "CorporateImport";
DROP TABLE IF EXISTS "TaficsProject";
