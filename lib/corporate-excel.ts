import * as XLSX from "xlsx";
import type { CorporateSource } from "./corporate-shared";

const text = (value: unknown) => String(value ?? "").trim() || null;
const key = (value: unknown) => (text(value) ?? "").toLocaleUpperCase("tr-TR").replace(/[İI]/g, "I").replace(/[^A-Z0-9ÇĞÖŞÜ]+/g, "_").replace(/^_|_$/g, "");

export function parseCorporateWorkbook(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  let sheet: XLSX.WorkSheet | undefined;
  for (const name of workbook.SheetNames) {
    const candidate = workbook.Sheets[name];
    const headers = XLSX.utils.sheet_to_json<unknown[]>(candidate, { header: 1, range: 0, blankrows: true })[0] ?? [];
    if (headers.some(header => key(header) === "CIZIM_ID")) { sheet = candidate; break; }
  }
  if (!sheet) throw new Error("CIZIM_ID sütunu bulunan Kurumsal proje sayfası bulunamadı.");
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const rows: CorporateSource[] = [], errors: { row: number; message: string }[] = [];
  const seen = new Set<string>();
  for (const [index, item] of raw.entries()) {
    const rowNumber = typeof item.__rowNum__ === "number" ? item.__rowNum__ + 1 : index + 2;
    const fields = Object.fromEntries(Object.entries(item).map(([name, value]) => [key(name), value]));
    const projectId = text(fields.CIZIM_ID);
    if (!projectId) { errors.push({ row: rowNumber, message: "CIZIM_ID eksik." }); continue; }
    if (seen.has(projectId)) { errors.push({ row: rowNumber, message: `Mükerrer Proje ID: ${projectId}` }); continue; }
    seen.add(projectId);
    const centralName = text(fields.SANTRAL_ADI), drawingName = text(fields.CIZIM_ADI);
    rows.push({ projectId, centralName, drawingName,
      district: centralName,
      address: drawingName,
      projectFeature: text(fields.PROJE_OZELLIGI), approvalStatus: text(fields.CIZIM_ONAY_DURUMU), rowNumber });
  }
  return { totalRows: raw.length, rows, errors };
}
