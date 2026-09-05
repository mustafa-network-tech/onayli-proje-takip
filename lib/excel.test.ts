import {describe,expect,it} from "vitest";import * as XLSX from "xlsx";import {parseWorkbook} from "./excel";
function workbook(rows:Record<string,unknown>[]){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"BİNA ADRESLERİ");return XLSX.write(wb,{type:"buffer",bookType:"xlsx"})}
describe("Excel parser",()=>{it("aynı CIZIM_ID satırlarını aynı proje altında korur ve GF PSTN/DSL almaz",()=>{const result=parseWorkbook(workbook([{CIZIM_ID:"3037531",UAVT:"1",BBK:12,PSTN:3,DSL:8},{CIZIM_ID:"3037531",UAVT:"2",BBK:7}]),"GF");expect(new Set(result.rows.map(x=>x.projectId)).size).toBe(1);expect(result.rows).toHaveLength(2);expect(result.rows[0].pstn).toBeNull();expect(result.rows.reduce((a,b)=>a+b.bbkHp,0)).toBe(19)});it("BF PSTN/DSL alanlarını alır ve duplicate bildirir",()=>{const result=parseWorkbook(workbook([{CIZIM_ID:"1",UAVT:"99",PSTN:3,DSL:8},{CIZIM_ID:"1",UAVT:"99"}]),"BF");expect(result.rows[0].dsl).toBe(8);expect(result.errors).toHaveLength(1)});it("boş nullable hücrelerle çalışır",()=>{expect(parseWorkbook(workbook([{CIZIM_ID:"1",DISKAPINO:"13 /5"}]),"GF").rows[0].doorNumber).toBe("13 /5")})});

function panelWorkbook(type: "BF" | "GF", completed = false) {
 const wb = XLSX.utils.book_new();
 const sheet = XLSX.utils.aoa_to_sheet([
  ["CIZIM_ID", "UAVT", "HP", "PROJEDEKİ TOPLAM KALAN HP", "PROJEDEKİ BİNA SAYISI", "PSTN", "DSL", "ALTYAPI_DURUMU"],
  [3133008, 34036035, 32, 100, 8, 8, 23, "Devam Ediyor"],
  [],
  [3133008, 34733160, 1, 100, 8, 1, 1, completed ? "Tamamlandı" : null],
 ]);
 for (const address of ["C2", "C4"]) sheet[address].s = { fill: { patternType: "solid", fgColor: { rgb: "92D050" } } };
 sheet.A2.s = { fill: { patternType: "solid", fgColor: { rgb: "00B050" } } };
 XLSX.utils.book_append_sheet(wb, sheet, `${type} KALAN İMALATLAR`);
 return wb;
}

describe("panel reference formats", () => {
 it.each(["BF", "GF"] as const)("reads %s HP and preserves completion and type rules", async (type) => {
  const styled = await import("xlsx-js-style");
  const result = parseWorkbook(styled.write(panelWorkbook(type, true), { type: "buffer", bookType: "xlsx" }), type);
  expect(result.totalRows).toBe(2);
  expect(result.errors).toEqual([]);
  expect(result.rows.map(r => r.bbkHp)).toEqual([32, 1]);
  expect(result.rows.map(r => r.excelCompleted)).toEqual([false, true]);
  expect(result.rows.map(r => r.rowNumber)).toEqual([2, 4]);
  expect(result.rows[0].pstn).toBe(type === "BF" ? 8 : null);
  expect(result.rows[0].dsl).toBe(type === "BF" ? 23 : null);
 });
 it("rejects the opposite project type instead of importing it under the wrong type", () => {
  expect(() => parseWorkbook(XLSX.write(panelWorkbook("BF"), {type:"buffer",bookType:"xlsx"}), "GF")).toThrow("Seçilen proje türünü kontrol edin");
 });
});

describe("infrastructure completion status", () => {
 it.each(["BF", "GF"] as const)("uses only the completed status in legacy %s sheets", (type) => {
  const statuses = ["Tamamlandı", " TAMAMLANDI ", "tamamlandı", "Tamamlanmadı", "Devam Ediyor", null];
  const result = parseWorkbook(workbook(statuses.map((status, i) => ({CIZIM_ID:"1", UAVT:String(i), ALTYAPI_DURUMU:status}))), type);
  expect(result.rows.map(row => row.excelCompleted)).toEqual([true,true,true,false,false,false]);
 });
});
