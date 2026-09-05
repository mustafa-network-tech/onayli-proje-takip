import { readFileSync } from "node:fs";
import Database from "better-sqlite3";
import * as XLSX from "xlsx";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ImportPreview } from "./hp-types";
const mocks = vi.hoisted(() => ({ context: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: mocks.context }));
vi.mock("./db", () => ({ db: {} }));
import { commitImport } from "./import";
import { parseWorkbook } from "./excel";
let sqlite: Database.Database;
let batches: number;
beforeEach(() => {
 vi.stubEnv("NODE_ENV", "production");
 sqlite = new Database(":memory:");
 sqlite.exec(readFileSync("migrations/0001_initial.sql", "utf8"));
 sqlite.exec(`INSERT INTO User (id,name,email) VALUES ('u','Test','test@example.com')`);
 batches = 0;
 mocks.context.mockReturnValue({ env: { DB: {
  prepare: (sql: string) => ({ bind: (...values: (string|number|null)[]) => {
   expect(values.length).toBeLessThanOrEqual(100);
   return {sql,values};
  }}),
  batch: async (statements: {sql:string;values:(string|number|null)[]}[]) => {
   batches++;
   return sqlite.transaction(() => statements.map(s => sqlite.prepare(s.sql).run(...s.values)))();
  },
 }}});
});
afterEach(() => { sqlite.close(); vi.unstubAllEnvs(); });
function preview(type: "BF" | "GF", replace = false): ImportPreview {
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(Array.from({length:120}, (_,i) => ({
  CIZIM_ID:"p", UAVT:String(i), HP:2, ALTYAPI_DURUMU:i===0?"Tamamlandı":null, REKOR_TARIH:"05.04.2017",
 }))), `${type} KALAN İMALATLAR`);
 const parsed = parseWorkbook(XLSX.write(wb,{type:"buffer",bookType:"xlsx"}),type);
 return JSON.parse(JSON.stringify({fileName:"test.xlsx",projectType:type,totalRows:120,newProjects:replace?0:1,
  newBuildings:120,replacedProjects:replace?1:0,rejectedRows:0,errors:[],rows:parsed.rows,
  decisions:[{projectId:"p",accepted:true,action:replace?"REPLACE":"CREATE"}],
 })) as ImportPreview;
}
it.each(["BF","GF"] as const)("commits large %s imports in one batch with completion and date values", async type => {
 const log = await commitImport(preview(type), "u");
 expect(batches).toBe(1);
 expect(sqlite.prepare('SELECT COUNT(*) AS n FROM HpBuilding').get()).toEqual({n:120});
 expect(sqlite.prepare('SELECT lastImportId FROM HpProject').get()).toEqual({lastImportId:log.id});
 expect(sqlite.prepare('SELECT cableCompleted, spliceCompleted, ibkCompleted, rekorDate FROM HpBuilding WHERE uavt = ?').get('0'))
  .toEqual({cableCompleted:1,spliceCompleted:1,ibkCompleted:type==='BF'?1:0,rekorDate:Date.UTC(2017,3,5)});
 expect(sqlite.prepare('SELECT cableCompleted FROM HpBuilding WHERE uavt = ?').get('1')).toEqual({cableCompleted:0});
});
it("replaces only the selected project type and rolls back a failed replacement", async () => {
 const original = await commitImport(preview("BF"),"u");
 await commitImport(preview("GF"),"u");
 sqlite.exec(`CREATE TRIGGER fail_building BEFORE INSERT ON HpBuilding BEGIN SELECT RAISE(ABORT, 'test failure'); END;`);
 await expect(commitImport(preview("BF",true),"u")).rejects.toThrow('test failure');
 expect(sqlite.prepare('SELECT lastImportId FROM HpProject WHERE projectType = ?').get('BF')).toEqual({lastImportId:original.id});
 expect(sqlite.prepare('SELECT COUNT(*) AS n FROM HpBuilding').get()).toEqual({n:240});
 expect(sqlite.prepare('SELECT COUNT(*) AS n FROM HpExcelImport').get()).toEqual({n:2});
 sqlite.exec('DROP TRIGGER fail_building');
 const replacement = await commitImport(preview("BF",true),"u");
 expect(sqlite.prepare('SELECT lastImportId FROM HpProject WHERE projectType = ?').get('BF')).toEqual({lastImportId:replacement.id});
 expect(sqlite.prepare('SELECT COUNT(*) AS n FROM HpBuilding').get()).toEqual({n:240});
});
