import { readFileSync } from "node:fs";
import Database from "better-sqlite3";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import * as StyledXLSX from "xlsx-js-style";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { emptyTaficsFilters, filterTaficsProjects, taficsHeaders, taficsSchema, taficsTotals, type TaficsInput } from "./tafics-shared";
import { taficsExcelBuffer } from "./tafics-export";

const mocks = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn(), auth: vi.fn() }));
vi.mock("./db", () => ({ db: { $queryRaw: mocks.query, $executeRaw: mocks.execute } }));
vi.mock("./auth", () => ({ requireUser: mocks.auth }));
import { createTaficsProject, findTaficsProjects, updateTaficsProject } from "./tafics";
import { POST } from "../app/api/tafics/route";
import { PATCH, DELETE } from "../app/api/tafics/[id]/route";
import { GET } from "../app/api/tafics/export/route";

let sqlite: Database.Database;
const fixture = (extra: Partial<TaficsInput> = {}): TaficsInput => ({ province: "ÇANAKKALE", projectName: "İZİN RADAR KOMUTANLIĞI", projectType: "TAFICS",
  underground: 6500.25, cable: 7000, horizontalDrilling: 400, permissionStatus: "ALINMADI", completionStatus: "BAŞLAMADI", description: "Uzun açıklama\n".repeat(1000), ...extra });
const request = (method: string, body?: unknown) => new Request("http://localhost/api/tafics", { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const context = (id: string) => ({ params: Promise.resolve({ id }) });
beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.mockResolvedValue({ id: "operator" });
  sqlite = new Database(":memory:");
  for (const file of ["0001_initial.sql", "0002_monthly_hp.sql", "0003_corporate.sql"]) sqlite.exec(readFileSync(`migrations/${file}`, "utf8"));
  sqlite.exec(`INSERT INTO HpProject (id,projectId,projectType,updatedAt) VALUES ('existing','existing','GF',CURRENT_TIMESTAMP)`);
  sqlite.exec(readFileSync("migrations/0004_tafics.sql", "utf8"));
  mocks.query.mockImplementation((query: TemplateStringsArray, ...values: unknown[]) => {
    const sql = Prisma.sql(query, ...values); return Promise.resolve(sqlite.prepare(sql.sql).all(...sql.values));
  });
  mocks.execute.mockImplementation((query: TemplateStringsArray, ...values: unknown[]) => {
    const sql = Prisma.sql(query, ...values); return Promise.resolve(sqlite.prepare(sql.sql).run(...sql.values).changes);
  });
});
afterEach(() => sqlite.close());

it("creates duplicate project names, renames by internal key and deletes only the confirmed record", async () => {
  const response = await POST(request("POST", fixture()));
  expect(response.status).toBe(201);
  const { project } = await response.json();
  const second = await createTaficsProject(fixture());
  expect(second.id).not.toBe(project.id);
  const changed = fixture({ projectName: "Yeni Proje Adı", province: "İZMİR", projectType: "Başka Tür", underground: 0, cable: 1.5,
    horizontalDrilling: 23, permissionStatus: "ALINDI", completionStatus: "TAMAMLANDI", description: "Yeni açıklama\nİkinci satır" });
  expect((await PATCH(request("PATCH", changed), context(project.id))).status).toBe(200);
  expect((await findTaficsProjects()).find(row => row.id === project.id)).toEqual({ ...changed, id: project.id });
  expect((await DELETE(request("DELETE", { confirmed: false }), context(project.id))).status).toBe(400);
  expect(await findTaficsProjects()).toHaveLength(2);
  expect((await DELETE(request("DELETE", { confirmed: true }), context(project.id))).status).toBe(200);
  expect(await findTaficsProjects()).toEqual([second]);
  expect((await DELETE(request("DELETE", { confirmed: true }), context(project.id))).status).toBe(404);
  expect((await PATCH(request("PATCH", changed), context(project.id))).status).toBe(404);
  expect(sqlite.prepare("SELECT projectId,projectType FROM HpProject").all()).toEqual([{ projectId: "existing", projectType: "GF" }]);
});
it("rejects missing names, invalid numbers, statuses and user supplied technical fields", async () => {
  for (const field of ["province", "projectName"]) expect((await POST(request("POST", { ...fixture(), [field]: "  " }))).status).toBe(400);
  for (const field of ["underground", "cable", "horizontalDrilling"]) for (const value of [-1, "15", "", null, NaN, Infinity, 1e13]) {
    expect(taficsSchema.safeParse({ ...fixture(), [field]: value }).success).toBe(false);
  }
  for (const field of ["permissionStatus", "completionStatus"]) expect(taficsSchema.safeParse({ ...fixture(), [field]: "UNKNOWN" }).success).toBe(false);
  for (const field of ["id", "projectId", "createdAt"]) expect(taficsSchema.safeParse({ ...fixture(), [field]: "user supplied" }).success).toBe(false);
  const row = await createTaficsProject(fixture());
  expect(() => sqlite.prepare('UPDATE TaficsProject SET cable=-1 WHERE id=?').run(row.id)).toThrow();
  expect(() => sqlite.prepare("UPDATE TaficsProject SET permissionStatus='INVALID' WHERE id=?").run(row.id)).toThrow();
});
it("combines Turkish case-insensitive search and all filters with matching totals", async () => {
  await createTaficsProject(fixture());
  await createTaficsProject(fixture({ province: "İZMİR", projectType: "Farklı", permissionStatus: "ALINDI", completionStatus: "DEVAM EDİYOR", underground: 10, cable: 20, horizontalDrilling: 30 }));
  const rows = await findTaficsProjects();
  expect(filterTaficsProjects(rows, { ...emptyTaficsFilters, q: "izin radar" })).toHaveLength(2);
  expect(filterTaficsProjects(rows, { ...emptyTaficsFilters, q: rows[0].id })).toHaveLength(0);
  for (const [field, value] of Object.entries({ province: "İZMİR", projectType: "Farklı", permissionStatus: "ALINDI", completionStatus: "DEVAM EDİYOR" })) {
    expect(filterTaficsProjects(rows, { ...emptyTaficsFilters, [field]: value })).toHaveLength(1);
  }
  const selected = filterTaficsProjects(rows, { q: "izmir", province: "İZMİR", projectType: "Farklı", permissionStatus: "ALINDI", completionStatus: "DEVAM EDİYOR" });
  expect(taficsTotals(selected)).toEqual({ underground: 10, cable: 20, horizontalDrilling: 30 });
  expect(taficsTotals(rows)).toEqual({ underground: 6510.25, cable: 7020, horizontalDrilling: 430 });
  expect(filterTaficsProjects(rows, { ...emptyTaficsFilters, q: "bulunamaz" })).toEqual([]);
});
it("exports nine columns without project type, with A4 print settings, numeric values and full notes", async () => {
  const first = await createTaficsProject(fixture({ projectName: "=1+1" }));
  const second = await createTaficsProject(fixture({ cable: 3.75 }));
  const buffer = taficsExcelBuffer([first, second]);
  const workbook = XLSX.read(buffer, { type: "buffer", cellStyles: true });
  const sheet = workbook.Sheets.TAFICS;
  expect(XLSX.utils.sheet_to_json(sheet, { header: 1 })[0]).toEqual(taficsHeaders.filter(header => header !== "PROJE TÜRÜ"));
  expect(sheet["!ref"]).toBe("A1:I4");
  expect([sheet.A2.v, sheet.A3.v]).toEqual([1, 2]);
  expect(sheet.C2.t).toBe("s"); expect(sheet.C2.f).toBeUndefined();
  expect(sheet.I2.v).toBe(first.description);
  for (const column of ["D", "E", "F"]) for (const row of [2, 3, 4]) expect(sheet[`${column}${row}`].t).toBe("n");
  expect([sheet.D4.v, sheet.E4.v, sheet.F4.v]).toEqual([13000.5, 7003.75, 800]);
  expect(sheet.C4.v).toBe("TOPLAM");
  expect(JSON.stringify(XLSX.utils.sheet_to_json(sheet, { header: 1 }))).not.toContain(first.id);
  expect(sheet.A1.s.fgColor.rgb).toBe("175D8D");
  expect(sheet.C4.s.fgColor.rgb).toBe("DFF3E8");
  expect(sheet["!cols"]?.[8].wch).toBe(36);
  expect(sheet["!rows"]?.[1].hpt).toBeGreaterThan(28);
  expect(workbook.Workbook?.Names).toEqual(expect.arrayContaining([
    expect.objectContaining({ Name: "_xlnm.Print_Area", Ref: "'TAFICS'!$A$1:$I$4" }),
    expect.objectContaining({ Name: "_xlnm.Print_Titles", Ref: "'TAFICS'!$1:$1" }),
  ]));
  const archive = StyledXLSX.CFB.read(buffer, { type: "buffer" });
  const xml = Buffer.from(StyledXLSX.CFB.find(archive, "/xl/worksheets/sheet1.xml").content).toString("utf8");
  expect(xml).toContain('<pageSetUpPr fitToPage="1"/>');
  expect(xml).toContain('<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>');
  const empty = XLSX.read(taficsExcelBuffer([]), { type: "buffer" }).Sheets.TAFICS;
  expect(empty.E2.v).toBe(0);
});
it("applies active filters to the downloadable xlsx", async () => {
  await createTaficsProject(fixture());
  await createTaficsProject(fixture({ province: "İZMİR", cable: 9 }));
  const response = await GET(new Request(`http://localhost/api/tafics/export?${new URLSearchParams({ q: "izin", province: "İZMİR", projectType: "TAFICS", permissionStatus: "ALINMADI", completionStatus: "BAŞLAMADI" })}`));
  expect(response.status).toBe(200);
  expect(response.headers.get("content-disposition")).toContain(".xlsx");
  const sheet = XLSX.read(await response.arrayBuffer()).Sheets.TAFICS;
  expect(sheet["!ref"]).toBe("A1:I3"); expect(sheet.B2.v).toBe("İZMİR"); expect(sheet.E3.v).toBe(9);
  expect((await GET(new Request("http://localhost/api/tafics/export?permissionStatus=invalid"))).status).toBe(400);
});
it("requires existing authentication on every endpoint before reading or writing data", async () => {
  mocks.auth.mockRejectedValue(new Error("Oturum gerekli"));
  const id = crypto.randomUUID();
  for (const response of [await POST(request("POST", fixture())), await PATCH(request("PATCH", fixture()), context(id)),
    await DELETE(request("DELETE", { confirmed: true }), context(id)), await GET(new Request("http://localhost/api/tafics/export"))]) expect(response.status).toBe(401);
  expect(mocks.query).not.toHaveBeenCalled(); expect(mocks.execute).not.toHaveBeenCalled();
});
it("keeps database errors private and handles malformed JSON and missing records", async () => {
  mocks.execute.mockRejectedValueOnce(new Error("SQL secret private database"));
  const failure = await POST(request("POST", fixture()));
  expect(failure.status).toBe(500); expect(await failure.text()).not.toContain("secret");
  expect((await POST(new Request("http://localhost/api/tafics", { method: "POST", body: "{" }))).status).toBe(400);
  expect(await updateTaficsProject(crypto.randomUUID(), fixture())).toBe(0);
});
