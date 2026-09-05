import * as XLSX from "xlsx-js-style";
import { corporateStatus, type CorporateProjectRow, type CorporateStatus } from "./corporate-shared";

export function corporateWorkbook(rows: CorporateProjectRow[], options: { status?: CorporateStatus; district?: string; q?: string; selected?: boolean } = {}) {
  const labels = { all: "Tüm Projeler", completed: "Tamamlanan Projeler", ongoing: "Devam Eden Projeler", not_started: "Başlanmayan Projeler" };
  const subtitle = [options.selected ? "Seçilen Projeler" : labels[options.status ?? "all"], options.district ? `İlçe: ${options.district}` : "", options.q ? `Arama: ${options.q}` : "", `${rows.length} proje`].filter(Boolean).join(" · ");
  const data = [
    ["TTVPN PROJELERİ", "", "", "", "", "", ""],
    [subtitle, "", "", "", "", "", ""],
    ["İlçe", "Adres", "ID", "Kablo", "Ek", "Durum", "Not"],
    ...rows.map(row => [row.district ?? "", row.address ?? "", row.projectId,
      row.cableCompleted ? "Yapıldı" : "Yapılmadı", row.spliceCompleted ? "Yapıldı" : "Yapılmadı", corporateStatus(row).label, row.note]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet["!cols"] = [{ wch: 27 }, { wch: 65 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 55 }];
  sheet["!rows"] = [{ hpt: 28 }, { hpt: 28 }, { hpt: 25 }, ...rows.map(row => ({ hpt: Math.max(30, Math.ceil((row.address ?? "").length / 55) * 16, Math.ceil(row.note.length / 45) * 16) }))];
  sheet["!merges"] = [{ s: {r:0,c:0}, e: {r:0,c:6} }, { s: {r:1,c:0}, e: {r:1,c:6} }];
  sheet["!autofilter"] = { ref: `A3:G${rows.length + 3}` };
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < 7; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell) continue;
      cell.s = { font: { name: "Calibri", sz: 11 }, alignment: { wrapText: true, vertical: "top" } };
      if (r < 3) cell.s = { ...cell.s, font: { name: "Calibri", sz: r === 0 ? 16 : 11, bold: true }, fill: { patternType: "solid", fgColor: { rgb: "D9EAF7" } } };
      else if (corporateStatus(rows[r - 3]).key === "completed") cell.s = { ...cell.s, fill: { patternType: "solid", fgColor: { rgb: "C6EFCE" } } };
    }
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "TTVPN PROJELERİ");
  return workbook;
}
