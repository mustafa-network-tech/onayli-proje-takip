import { readFileSync } from "node:fs";
import Database from "better-sqlite3";
import { Prisma } from "@prisma/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { statusMatch } from "./project-filters";
import { manufacturing, hpWeightedProgress } from "./stats";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), batch: vi.fn(), query: vi.fn() }));
vi.mock("./auth", () => ({ requireUser: mocks.auth }));
vi.mock("./db", () => ({ db: { hpBuilding: { findUnique: mocks.find }, $queryRaw: mocks.query } }));
vi.mock("./sql-batch", () => ({ executeSqlBatch: mocks.batch }));
import { PATCH } from "../app/api/buildings/[id]/cancel/route";
import { findProjectLocations } from "./project-lookup";
let sqlite: Database.Database;
beforeEach(() => {
  vi.resetAllMocks(); sqlite = new Database(":memory:");
  for (const file of ["0001_initial.sql", "0002_monthly_hp.sql", "0003_corporate.sql", "0005_building_cancelled.sql"]) sqlite.exec(readFileSync(`migrations/${file}`, "utf8"));
  sqlite.exec(`INSERT INTO User (id,name,email) VALUES ('u','Test','test@test');
    INSERT INTO HpProject (id,projectId,projectType,updatedAt) VALUES ('p','00123','GF',0);
    INSERT INTO HpBuilding (id,projectRefId,sourceKey,updatedAt) VALUES ('b','p','b',0);
    INSERT INTO HpBuilding (id,projectRefId,sourceKey,updatedAt) VALUES ('other','p','other',0);
    INSERT INTO CorporateProject (id,projectId) VALUES ('c','00123');`);
  mocks.auth.mockResolvedValue({ id: "u" });
  mocks.find.mockImplementation(() => { const b = sqlite.prepare('SELECT * FROM HpBuilding WHERE id=?').get('b') as Record<string, unknown>; return { ...b, isActive: true, isCancelled: Boolean(b.isCancelled), project: { projectType: "GF" } }; });
  mocks.batch.mockImplementation((commands: {sql:string;values:unknown[]}[]) => sqlite.transaction(() => commands.forEach(c => sqlite.prepare(c.sql).run(...c.values)))());
  mocks.query.mockImplementation((q: TemplateStringsArray, ...v: unknown[]) => { const s = Prisma.sql(q, ...v); return sqlite.prepare(s.sql).all(...s.values); });
});
afterEach(() => sqlite.close());
const request = (cancelled: unknown) => new Request("http://localhost/cancel", {method:"PATCH",body:JSON.stringify({cancelled})});
const context = { params: Promise.resolve({id:"b"}) };
it("cancels only the selected building, records history and restores it", async () => {
  expect((await PATCH(request(true),context)).status).toBe(200);
  expect(sqlite.prepare('SELECT isCancelled FROM HpBuilding ORDER BY id').all()).toEqual([{isCancelled:1},{isCancelled:0}]);
  expect((await PATCH(request(false),context)).status).toBe(200);
  expect(sqlite.prepare('SELECT count(*) AS count FROM HpBuildingHistory').get()).toEqual({count:2});
});
it("rejects unauthorized and malformed cancellation", async () => {
  mocks.auth.mockRejectedValueOnce(new Error());
  expect((await PATCH(request(true),context)).status).toBe(401);
  expect((await PATCH(request("true"),context)).status).toBe(400);
  expect(mocks.batch).not.toHaveBeenCalled();
});
it("excludes cancelled buildings from every active status and HP progress", () => {
  const cancelled = {bbkHp:100,cableCompleted:false,spliceCompleted:false,obkCompleted:false,isCancelled:true};
  for (const status of ["incomplete","not_started","ongoing","completed"]) expect(statusMatch(0,status,true)).toBe(false);
  expect(statusMatch(0,"cancelled",true)).toBe(true);expect(statusMatch(0,undefined,true)).toBe(true);
  expect(statusMatch(0,"cancelled",false)).toBe(false);
  expect(manufacturing(cancelled,"BF").status).toBe("İptal");
  expect(hpWeightedProgress([cancelled,{...cancelled,isCancelled:false,bbkHp:10,cableCompleted:true,spliceCompleted:true,obkCompleted:true}],"BF")).toBe(100);
});
it("finds exact IDs across HP and corporate without partial or injected matches", async () => {
  expect((await findProjectLocations("00123,00123")).map(p=>p.projectType)).toEqual(["GF","KURUMSAL"]);
  expect(await findProjectLocations("123")).toEqual([]);
  expect(await findProjectLocations("' OR 1=1 --")).toEqual([]);
});
