import * as XLSX from "xlsx";
import type { ParsedBuilding, ProjectType } from "./hp-types";

const tr = (v: unknown) => String(v ?? "").trim();
const key = (v: unknown) => tr(v).toLocaleUpperCase("tr-TR").replace(/[İI]/g, "I").replace(/[^A-Z0-9ĞÜŞÖÇ]+/g, "_").replace(/^_|_$/g, "");
const text = (v: unknown) => { const s = tr(v); return s ? s : null; };
const integer = (v: unknown) => { if (v === null || v === undefined || tr(v) === "") return null; const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) ? Math.round(n) : null; };
const date = (v: unknown) => {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v.valueOf())) return v;
  if (typeof v === "number") { const d = XLSX.SSF.parse_date_code(v); return d ? new Date(Date.UTC(d.y, d.m - 1, d.d, d.H, d.M, Math.floor(d.S))) : null; }
  const parts = tr(v).match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/); if (parts) return new Date(Date.UTC(+parts[3], +parts[2] - 1, +parts[1]));
  const parsed = new Date(tr(v)); return isNaN(parsed.valueOf()) ? null : parsed;
};
const aliases: Record<string, string[]> = {
  projectId:["CIZIM_ID","ÇİZİM_ID"], centralName:["SANTRAL_ADI"], projectYear:["PROJE_YILI"], uavt:["UAVT"], district:["ILCE_AD","İLÇE_AD"], neighborhood:["MAH_AD"], street:["CSBM_AD"], buildingName:["BINA_ADI","BİNA_ADI"], doorNumber:["DISKAPINO","DIŞKAPINO"], bbkHp:["HP","BBK"], pstn:["PSTN"], dsl:["DSL"], infrastructureStatus:["ALTYAPI_DURUMU"], workProgressDate:["ISILERLEME_TARIH","İŞİLERLEME_TARİH","IS_ILERLEME_TARIHI"], rekorDate:["REKOR_TARIH","REKOR_TARİH"], equivalentBuildingCode:["ES_BINA_KODU","EŞ_BİNA_KODU"], csbmCode:["CSBM_KOD"]
};
const pick = (row: Record<string, unknown>, name: string) => { const options = aliases[name].map(key); const found = Object.keys(row).find(k => options.includes(key(k))); return found ? row[found] : undefined; };
export const addressKey = (r: Pick<ParsedBuilding,"district"|"neighborhood"|"street"|"doorNumber"|"buildingName">) => [r.district,r.neighborhood,r.street,r.doorNumber,r.buildingName].map(v => key(v)).join("|");
export function sourceKey(row: ParsedBuilding) { return row.uavt ? `U:${key(row.uavt)}` : `A:${addressKey(row)}`; }

export function parseWorkbook(buffer: Buffer, projectType: ProjectType) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const panelSheetName = `${projectType} KALAN İMALATLAR`;
  const sheetName = workbook.SheetNames.find(n => key(n) === key(panelSheetName))
    ?? workbook.SheetNames.find(n => key(n) === key("BİNA ADRESLERİ"));
  if (!sheetName) throw new Error(`'${panelSheetName}' veya 'BİNA ADRESLERİ' sayfası bulunamadı. Seçilen proje türünü kontrol edin.`);
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
  const errors: { row: number; message: string }[] = []; const rows: ParsedBuilding[] = [];
  raw.forEach((r, i) => {
    const excelRow = typeof r.__rowNum__ === "number" ? r.__rowNum__ : range.s.r + i + 1;
    const rowNumber = excelRow + 1; const projectId = text(pick(r,"projectId"));
    if (!projectId) { errors.push({ row: rowNumber, message: "CIZIM_ID / Proje ID eksik" }); return; }
    const excelCompleted = key(pick(r, "infrastructureStatus")) === key("Tamamlandı");
    const row = { projectId, centralName:text(pick(r,"centralName")), projectYear:integer(pick(r,"projectYear")), uavt:text(pick(r,"uavt")), district:text(pick(r,"district")), neighborhood:text(pick(r,"neighborhood")), street:text(pick(r,"street")), buildingName:text(pick(r,"buildingName")), doorNumber:text(pick(r,"doorNumber")), bbkHp:integer(pick(r,"bbkHp")) ?? 0, pstn:projectType === "BF" ? integer(pick(r,"pstn")) : null, dsl:projectType === "BF" ? integer(pick(r,"dsl")) : null, infrastructureStatus:text(pick(r,"infrastructureStatus")), workProgressDate:date(pick(r,"workProgressDate")), rekorDate:date(pick(r,"rekorDate")), equivalentBuildingCode:text(pick(r,"equivalentBuildingCode")), csbmCode:text(pick(r,"csbmCode")), sourceKey:"", rowNumber,excelCompleted } satisfies ParsedBuilding;
    row.sourceKey = sourceKey(row); rows.push(row);
  });
  const seen = new Map<string, number>(); const unique: ParsedBuilding[] = [];
  for (const row of rows) { const k = `${row.projectId}|${row.sourceKey}`; if (seen.has(k)) errors.push({ row: row.rowNumber, message: `Dosya içinde mükerrer bina (ilk satır: ${seen.get(k)})` }); else { seen.set(k,row.rowNumber); unique.push(row); } }
  return { totalRows: raw.length, rows: unique, errors };
}
