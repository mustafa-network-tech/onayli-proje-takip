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
  projectId:["CIZIM_ID","ÇİZİM_ID"], centralName:["SANTRAL_ADI"], projectYear:["PROJE_YILI"], uavt:["UAVT"], district:["ILCE_AD","İLÇE_AD"], neighborhood:["MAH_AD"], street:["CSBM_AD"], buildingName:["BINA_ADI","BİNA_ADI"], doorNumber:["DISKAPINO","DIŞKAPINO"], bbkHp:["BBK"], pstn:["PSTN"], dsl:["DSL"], infrastructureStatus:["ALTYAPI_DURUMU"], workProgressDate:["ISILERLEME_TARIH","İŞİLERLEME_TARİH","IS_ILERLEME_TARIHI"], rekorDate:["REKOR_TARIH","REKOR_TARİH"], equivalentBuildingCode:["ES_BINA_KODU","EŞ_BİNA_KODU"], csbmCode:["CSBM_KOD"]
};
const pick = (row: Record<string, unknown>, name: string) => { const options = aliases[name].map(key); const found = Object.keys(row).find(k => options.includes(key(k))); return found ? row[found] : undefined; };
export const addressKey = (r: Pick<ParsedBuilding,"district"|"neighborhood"|"street"|"doorNumber"|"buildingName">) => [r.district,r.neighborhood,r.street,r.doorNumber,r.buildingName].map(v => key(v)).join("|");
export function sourceKey(row: ParsedBuilding) { return row.uavt ? `U:${key(row.uavt)}` : `A:${addressKey(row)}`; }
export function isGreenFill(style:unknown){const s=style as {patternType?:string;fgColor?:{rgb?:string;indexed?:number};fill?:{patternType?:string;fgColor?:{rgb?:string;indexed?:number}}}|undefined,fill=s?.fill??s,color=fill?.fgColor;if(!color)return false;if(color.indexed!==undefined&&[4,17,42,50].includes(color.indexed))return true;const rgb=color.rgb?.replace(/^FF/i,"");if(!rgb||rgb.length!==6)return false;const r=parseInt(rgb.slice(0,2),16),g=parseInt(rgb.slice(2,4),16),b=parseInt(rgb.slice(4,6),16);return g>=80&&g>r*1.12&&g>b*1.08}

export function parseWorkbook(buffer: Buffer, projectType: ProjectType) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, cellStyles: true });
  const sheetName = workbook.SheetNames.find(n => key(n) === key("BİNA ADRESLERİ"));
  if (!sheetName) throw new Error("'BİNA ADRESLERİ' sayfası bulunamadı.");
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: null, raw: true });
  const errors: { row: number; message: string }[] = []; const rows: ParsedBuilding[] = [];
  raw.forEach((r, i) => {
    const rowNumber = i + 2; const projectId = text(pick(r,"projectId"));
    if (!projectId) { errors.push({ row: rowNumber, message: "CIZIM_ID / Proje ID eksik" }); return; }
    const range=XLSX.utils.decode_range(workbook.Sheets[sheetName]["!ref"]??"A1:A1"),excelCompleted=Array.from({length:range.e.c-range.s.c+1},(_,offset)=>workbook.Sheets[sheetName][XLSX.utils.encode_cell({r:i+1,c:range.s.c+offset})]).some(cell=>isGreenFill(cell?.s));
    const row = { projectId, centralName:text(pick(r,"centralName")), projectYear:integer(pick(r,"projectYear")), uavt:text(pick(r,"uavt")), district:text(pick(r,"district")), neighborhood:text(pick(r,"neighborhood")), street:text(pick(r,"street")), buildingName:text(pick(r,"buildingName")), doorNumber:text(pick(r,"doorNumber")), bbkHp:integer(pick(r,"bbkHp")) ?? 0, pstn:projectType === "BF" ? integer(pick(r,"pstn")) : null, dsl:projectType === "BF" ? integer(pick(r,"dsl")) : null, infrastructureStatus:text(pick(r,"infrastructureStatus")), workProgressDate:date(pick(r,"workProgressDate")), rekorDate:date(pick(r,"rekorDate")), equivalentBuildingCode:text(pick(r,"equivalentBuildingCode")), csbmCode:text(pick(r,"csbmCode")), sourceKey:"", rowNumber,excelCompleted } satisfies ParsedBuilding;
    row.sourceKey = sourceKey(row); rows.push(row);
  });
  const seen = new Map<string, number>(); const unique: ParsedBuilding[] = [];
  for (const row of rows) { const k = `${row.projectId}|${row.sourceKey}`; if (seen.has(k)) errors.push({ row: row.rowNumber, message: `Dosya içinde mükerrer bina (ilk satır: ${seen.get(k)})` }); else { seen.set(k,row.rowNumber); unique.push(row); } }
  return { totalRows: raw.length, rows: unique, errors };
}
