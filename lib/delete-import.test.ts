import { readFileSync } from "node:fs";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ context: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: mocks.context }));
vi.mock("./db", () => ({ db: {} }));
import { deleteExcelImport } from "./delete-import";

let sqlite: Database.Database;
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  sqlite = new Database(":memory:");
  sqlite.exec(readFileSync("migrations/0001_initial.sql", "utf8"));
  sqlite.exec(`
    INSERT INTO User (id,name,email) VALUES ('u','Test','test@example.com');
    INSERT INTO HpExcelImport (id,projectType,fileName,importedBy,totalRows,status) VALUES
      ('target','GF','target.xlsx','u',150,'COMPLETED'), ('other','GF','other.xlsx','u',1,'COMPLETED');
  `);
  for (let i = 0; i < 151; i++) {
    const owner = i < 150 ? "target" : "other";
    sqlite.prepare('INSERT INTO HpProject (id,projectId,projectType,lastImportId,updatedAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)').run(`p${i}`, `${i}`, 'GF', owner);
    sqlite.prepare('INSERT INTO HpBuilding (id,projectRefId,sourceKey,updatedAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(`b${i}`, `p${i}`, `${i}`);
    sqlite.prepare('INSERT INTO HpBuildingNote (id,buildingId,note,createdBy) VALUES (?, ?, ?, ?)').run(`n${i}`, `b${i}`, 'note', 'u');
    sqlite.prepare('INSERT INTO HpBuildingHistory (id,buildingId,actionType,description,createdBy) VALUES (?, ?, ?, ?, ?)').run(`h${i}`, `b${i}`, 'TEST', 'test', 'u');
  }
  mocks.context.mockReturnValue({ env: { DB: {
    prepare: (sql: string) => ({ bind: (id: string) => ({ sql, id }) }),
    batch: async (statements: { sql: string; id: string }[]) => sqlite.transaction(() => statements.map(({ sql, id }) => {
      const query = sqlite.prepare(sql);
      return { results: query.reader ? query.all(id) : (query.run(id), []) };
    }))(),
  } } });
});
afterEach(() => { sqlite.close(); vi.unstubAllEnvs(); });
const count = (table: string) => (sqlite.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get() as { count: number }).count;

describe("Excel import deletion", () => {
  it("deletes a large import and its dependents while preserving other imports", async () => {
    expect(await deleteExcelImport("target")).toEqual({ projects: 150, buildings: 150 });
    for (const table of ['HpExcelImport', 'HpProject', 'HpBuilding', 'HpBuildingNote', 'HpBuildingHistory']) expect(count(table)).toBe(1);
    expect(await deleteExcelImport("target")).toBeNull();
    expect(await deleteExcelImport("other")).toEqual({ projects: 1, buildings: 1 });
  });
  it("rolls back project and dependent deletions if deleting the import fails", async () => {
    sqlite.exec(`CREATE TRIGGER prevent_delete BEFORE DELETE ON HpExcelImport BEGIN SELECT RAISE(ABORT, 'test failure'); END;`);
    await expect(deleteExcelImport("target")).rejects.toThrow("test failure");
    expect(count('HpExcelImport')).toBe(2);
    for (const table of ['HpProject', 'HpBuilding', 'HpBuildingNote', 'HpBuildingHistory']) expect(count(table)).toBe(151);
  });
  it("returns not found without deleting anything for an unknown ID", async () => {
    expect(await deleteExcelImport("missing' OR 1=1 --")).toBeNull();
    expect(count('HpProject')).toBe(151);
  });
});
