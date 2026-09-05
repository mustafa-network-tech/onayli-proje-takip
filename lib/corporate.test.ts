import { readFileSync } from "node:fs";
import Database from "better-sqlite3";
import * as XLSX from "xlsx";
import * as StyledXLSX from "xlsx-js-style";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { parseCorporateWorkbook } from "./corporate-excel";
import { corporateStatus, type CorporateProjectRow } from "./corporate-shared";
import { corporateWorkbook } from "./corporate-export";
import type { SqlCommand } from "./monthly-hp-sql";
const mocks = vi.hoisted(() => ({ query: vi.fn(), batch: vi.fn() }));
vi.mock("./db", () => ({ db: { $queryRaw: mocks.query } }));
vi.mock("./sql-batch", () => ({ executeSqlBatch: mocks.batch }));
import { commitCorporateImport, corporateCommitSchema, findCorporateProjects, previewCorporateImport } from "./corporate";

let sqlite: Database.Database;
function source(rows: Record<string, unknown>[]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Sayfa1");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
const fixture = () => source([
  { SANTRAL_ADI: "BİGA-48", CIZIM_ADI: "UCA1058", CIZIM_ID: "001", CIZIM_ONAY_DURUMU: "Onaylandı" },
  { SANTRAL_ADI: "LAPSEKİ-49,ÇARDAK-49", CIZIM_ADI: "ÖRNEK ADRES", CIZIM_ID: "002" },
  { SANTRAL_ADI: "ÇANAKKALE-49", CIZIM_ADI: "TEST ADRES", CIZIM_ID: "003" },
]);
beforeEach(() => {
  sqlite = new Database(":memory:");
  sqlite.exec(readFileSync("migrations/0001_initial.sql", "utf8"));
  sqlite.exec(readFileSync("migrations/0003_corporate.sql", "utf8"));
  mocks.query.mockImplementation((query: Prisma.Sql | TemplateStringsArray, ...values: unknown[]) => {
    const statement = Array.isArray(query) ? Prisma.sql(query as TemplateStringsArray, ...values) : query as Prisma.Sql;
    return Promise.resolve(sqlite.prepare(statement.sql).all(...statement.values));
  });
  mocks.batch.mockImplementation(async (commands: SqlCommand[]) => sqlite.transaction(() => commands.map(command => {
    expect(command.values.length).toBeLessThanOrEqual(100);
    return sqlite.prepare(command.sql).run(...command.values);
  }))());
});
afterEach(() => sqlite.close());

it("uses the exact requested district/address/ID mapping and keeps leading zeros", () => {
  const parsed = parseCorporateWorkbook(fixture());
  expect(parsed.errors).toEqual([]);
  expect(parsed.rows[0]).toMatchObject({ projectId: "001", district: "BİGA-48", address: "UCA1058" });
  expect(parsed.rows[1].district).toBe("LAPSEKİ-49,ÇARDAK-49");
});
it("reports missing and duplicate IDs rather than creating duplicate projects", () => {
  const parsed = parseCorporateWorkbook(source([{ CIZIM_ID: "1" }, { CIZIM_ID: "1" }, { CIZIM_ID: null, CIZIM_ADI: "missing" }]));
  expect(parsed.rows).toHaveLength(1); expect(parsed.errors.map(error => error.row)).toEqual([3,4]);
  expect(() => parseCorporateWorkbook(source([{ ID: "1" }]))).toThrow("CIZIM_ID");
});
it("imports initially unstarted projects and keeps manual changes on reimport", async () => {
  const preview = await previewCorporateImport(fixture(), "test.xlsx");
  expect(preview.newProjects).toBe(3);
  await commitCorporateImport(preview, "u");
  let rows = await findCorporateProjects({ status: "all" });
  expect(rows.every(row => corporateStatus(row).key === "not_started")).toBe(true);
  sqlite.exec(`UPDATE CorporateProject SET cableCompleted=1,spliceCompleted=1,note='Saved note',district='Manual district',address='Manual address',districtEdited=1,addressEdited=1 WHERE projectId='001'`);
  const again = await previewCorporateImport(source([{ SANTRAL_ADI: "NEW", CIZIM_ADI: "NEW ADDRESS", CIZIM_ID: "001" }]), "again.xlsx");
  expect(again.existingProjects).toBe(1);
  await commitCorporateImport(again, "u");
  rows = await findCorporateProjects({ status: "all" });
  expect(rows).toHaveLength(3);
  expect(rows.find(row => row.projectId === "001")).toMatchObject({ cableCompleted:true,spliceCompleted:true,note:'Saved note',district:'Manual district',address:'Manual address' });
  expect(sqlite.prepare("SELECT centralName FROM CorporateProject WHERE projectId='001'").get()).toEqual({centralName:'NEW'});
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM HpProject').get()).toEqual({n:0});
});
it("filters all three progress states, district and ID consistently", async () => {
  await commitCorporateImport(await previewCorporateImport(fixture(), "test.xlsx"), "u");
  sqlite.exec("UPDATE CorporateProject SET cableCompleted=1 WHERE projectId IN ('001','002'); UPDATE CorporateProject SET spliceCompleted=1 WHERE projectId='001'");
  for (const [status, id] of [["completed","001"],["ongoing","002"],["not_started","003"]] as const) {
    expect((await findCorporateProjects({status})).map(row=>row.projectId)).toEqual([id]);
  }
  expect((await findCorporateProjects({status:'all',district:'BİGA-48'}))).toHaveLength(1);
  expect((await findCorporateProjects({status:'all',q:'003'}))[0].projectId).toBe('003');
  expect(corporateStatus({cableCompleted:false,spliceCompleted:true}).label).toBe('Devam Ediyor');
});
it("exports panel headers, status, notes and a green fill across every completed row cell", () => {
  const base: CorporateProjectRow = { id:'x',projectId:'001',district:'BİGA-48',address:'TEST',cableCompleted:true,spliceCompleted:true,note:'' };
  const workbook = corporateWorkbook([base,{...base,id:'y',projectId:'002',spliceCompleted:false}]);
  const saved = XLSX.read(StyledXLSX.write(workbook,{type:'buffer',bookType:'xlsx'}),{type:'buffer',cellStyles:true});
  const sheet = saved.Sheets[saved.SheetNames[0]];
  expect(sheet.A1.v).toBe('TTVPN PROJELERİ');
  expect(XLSX.utils.sheet_to_json(sheet,{header:1})[2]).toEqual(['İlçe','Adres','ID','Kablo','Ek','Durum','Not']);
  expect(sheet.C4.v).toBe('001'); expect(sheet.F4.v).toBe('Tamamlandı'); expect(sheet.F5.v).toBe('Devam Ediyor');
  for (let col=0;col<7;col++) expect(sheet[XLSX.utils.encode_cell({r:3,c:col})].s.fgColor.rgb).toBe('C6EFCE');
  expect(sheet.A5.s?.fgColor?.rgb).not.toBe('C6EFCE');
  const selected = corporateWorkbook([base],{selected:true});
  expect(selected.Sheets[selected.SheetNames[0]].A2.v).toContain('Seçilen Projeler');
});
it("rejects duplicate IDs at commit and rolls back an entire failed import", async () => {
  const preview = await previewCorporateImport(fixture(), "test.xlsx");
  expect(corporateCommitSchema.safeParse({...preview,rows:[preview.rows[0],preview.rows[0]]}).success).toBe(false);
  sqlite.exec(`CREATE TRIGGER fail_corporate BEFORE INSERT ON CorporateProject WHEN NEW.projectId='002' BEGIN SELECT RAISE(ABORT,'test failure'); END;`);
  await expect(commitCorporateImport(preview,"u")).rejects.toThrow('test failure');
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM CorporateProject').get()).toEqual({n:0});
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM CorporateImport').get()).toEqual({n:0});
});
