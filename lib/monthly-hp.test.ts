import { readFileSync } from "node:fs";
import Database from "better-sqlite3";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { completionCapture } from "./monthly-hp-sql";
import { currentMonth, buildingAddress, hpTotals } from "./monthly-hp-shared";
import { monthlyHpWorkbook } from "./monthly-hp-export";
const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("./db", () => ({ db: { $queryRaw: mocks.query } }));
import { getMonthlyHpReport, findMonthlyHpRows, reportFilters } from "./monthly-hp";

let sqlite: Database.Database;
function addBuilding(id: string, type: "GF" | "BF", done: boolean, hp = 12) {
  sqlite.prepare('INSERT OR IGNORE INTO HpProject (id,projectId,projectType,lastImportId,updatedAt) VALUES (?,?,?,?,0)').run(type,type,type,'import');
  sqlite.prepare(`INSERT INTO HpBuilding (id,projectRefId,sourceKey,uavt,district,neighborhood,street,buildingName,doorNumber,bbkHp,cableCompleted,spliceCompleted,ibkCompleted,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0)`).run(id,type,`U:${id}`,id,'MERKEZ','BARBAROS','SEHER','TEST APARTMANI','12 A',hp,Number(done),Number(done),Number(done));
}
function capture(source: "import" | "panel", id: string) {
  const command = completionCapture(source, id);
  sqlite.prepare(command.sql).run(...command.values);
}
beforeEach(() => {
  sqlite = new Database(":memory:");
  sqlite.exec(readFileSync("migrations/0001_initial.sql", "utf8"));
  sqlite.exec(readFileSync("migrations/0002_monthly_hp.sql", "utf8"));
  mocks.query.mockImplementation((query: Prisma.Sql | TemplateStringsArray, ...values: unknown[]) => {
    const statement = Array.isArray(query) ? Prisma.sql(query as TemplateStringsArray, ...values) : query as Prisma.Sql;
    return Promise.resolve(sqlite.prepare(statement.sql).all(...statement.values));
  });
});
afterEach(() => { sqlite.close(); });

it("records imports in the previous Istanbul calendar month, including January rollover", () => {
  addBuilding('b1','GF',true);
  const command = completionCapture('import','import');
  sqlite.prepare(command.sql.replace("'now'", "'2026-01-01 00:30:00'")).run(...command.values);
  expect(sqlite.prepare('SELECT month,hp FROM HpMonthlyCompletion').get()).toEqual({month:'2025-12',hp:12});
});
it("captures panel completion only after all GF/BF steps and uses Istanbul month boundaries", () => {
  addBuilding('gf','GF',true);
  addBuilding('bf','BF',true);
  sqlite.exec("UPDATE HpBuilding SET ibkCompleted=0");
  capture('panel','gf'); capture('panel','bf');
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM HpMonthlyCompletion').get()).toEqual({n:1});
  sqlite.exec("UPDATE HpBuilding SET ibkCompleted=1 WHERE id='bf'");
  const command = completionCapture('panel','bf');
  sqlite.prepare(command.sql.replace("'now'", "'2026-08-31 21:30:00'")).run(...command.values);
  expect(sqlite.prepare("SELECT month FROM HpMonthlyCompletion WHERE projectType='BF'").get()).toEqual({month:'2026-09'});
});
it("keeps one immutable snapshot across reimport and source deletion", () => {
  addBuilding('b','GF',true); capture('import','import');
  sqlite.exec("UPDATE HpBuilding SET bbkHp=999,street='NEW ADDRESS'");
  capture('import','import'); capture('panel','b');
  sqlite.exec("DELETE FROM HpProject");
  expect(sqlite.prepare('SELECT hp,street FROM HpMonthlyCompletion').all()).toEqual([{hp:12,street:'SEHER'}]);
});
it("separates monthly completion, current remaining and GF/BF scopes", async () => {
  addBuilding('gf-done','GF',true,10); addBuilding('bf-done','BF',true,20);
  addBuilding('gf-left','GF',false,4); addBuilding('bf-left','BF',false,8);
  capture('import','import');
  sqlite.exec("UPDATE HpMonthlyCompletion SET month='2026-09'");
  const report = await getMonthlyHpReport(reportFilters({month:'2026-09'}));
  expect(hpTotals(report.rows).ALL).toEqual({hp:30,buildings:2});
  expect(report.remaining.reduce((n,r)=>n+r.hp,0)).toBe(12);
  expect((await findMonthlyHpRows(reportFilters({month:'2026-09',type:'GF'}))).map(row=>row.hp)).toEqual([10]);
  expect(await findMonthlyHpRows(reportFilters({month:'2026-08'}))).toEqual([]);
  const remaining = await findMonthlyHpRows(reportFilters({month:'2020-01',list:'remaining'}));
  expect(hpTotals(remaining).ALL).toEqual({hp:12,buildings:2});
  expect((await findMonthlyHpRows(reportFilters({month:'2026-09',list:'remaining',type:'BF'}))).map(row=>row.hp)).toEqual([8]);
});
it("exports IDs, full addresses and numeric HP totals with the requested scope", async () => {
  addBuilding('gf','GF',true,32); capture('panel','gf');
  const options = reportFilters({month:currentMonth(),type:'GF'});
  const rows = await findMonthlyHpRows(options);
  const workbook = monthlyHpWorkbook(rows, options);
  const saved = XLSX.read(XLSX.write(workbook,{type:'buffer',bookType:'xlsx'}),{type:'buffer'});
  const data = XLSX.utils.sheet_to_json(saved.Sheets[saved.SheetNames[0]],{header:1}) as unknown[][];
  expect(data[2]).toEqual(['GF','GF','gf',buildingAddress(rows[0]),32,currentMonth()]);
  expect(data[3][4]).toBe(32);
  expect(saved.Sheets[saved.SheetNames[0]].E3.t).toBe('n');
});
it("validates filters and computes the local month", () => {
  expect(currentMonth(new Date('2026-08-31T21:30:00Z'))).toBe('2026-09');
  expect(() => reportFilters({month:'2026-13'})).toThrow();
  expect(() => reportFilters({type:'invalid'})).toThrow();
  expect(() => reportFilters({list:'invalid'})).toThrow();
});

it("backfills existing completed buildings into the previous month without changing source rows", () => {
  sqlite.exec('DROP TABLE HpMonthlyCompletion');
  addBuilding('done','GF',true,40); addBuilding('left','BF',false,16);
  const before = sqlite.prepare('SELECT * FROM HpBuilding ORDER BY id').all();
  sqlite.exec(readFileSync('migrations/0002_monthly_hp.sql','utf8'));
  const expected = sqlite.prepare("SELECT strftime('%Y-%m','now','+3 hours','start of month','-1 month') AS month").get() as {month:string};
  expect(sqlite.prepare('SELECT hp,month FROM HpMonthlyCompletion').all()).toEqual([{hp:40,month:expected.month}]);
  expect(sqlite.prepare('SELECT * FROM HpBuilding ORDER BY id').all()).toEqual(before);
});
