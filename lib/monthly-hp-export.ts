import * as XLSX from "xlsx-js-style";
import { buildingAddress, monthLabel, type MonthlyHpRow, type HpList, type HpScope } from "./monthly-hp-shared";

export function monthlyHpWorkbook(rows: MonthlyHpRow[], options: { month: string; list: HpList; scope: HpScope }) {
  const scope = options.scope === "ALL" ? "GF + BF" : options.scope;
  const title = options.list === "remaining" ? `${scope} — Güncel Kalan Binalar` : `${scope} — ${monthLabel(options.month)} Tamamlanan Binalar`;
  const values: (string | number)[][] = [
    [title],
    ["Tür", "Proje ID", "UAVT", "Bina Adresi", "HP Sayısı", "Tamamlanma Ayı"],
    ...rows.map(row => [row.projectType, row.projectId, row.uavt ?? "", buildingAddress(row), Number(row.hp), row.month ?? ""]),
    ["TOPLAM", `${rows.length} bina`, "", "", rows.reduce((total, row) => total + Number(row.hp), 0), ""],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(values);
  sheet["!cols"] = [{ wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 85 }, { wch: 14 }, { wch: 20 }];
  sheet["!rows"] = [{ hpt: 28 }, { hpt: 25 }, ...rows.map(row => ({ hpt: Math.max(30, Math.ceil(buildingAddress(row).length / 70) * 16) })), { hpt: 25 }];
  sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  sheet["!autofilter"] = { ref: `A2:F${rows.length + 2}` };
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < 6; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell) continue;
      cell.s = { font: { name: "Calibri", sz: 11 }, alignment: { vertical: "top", wrapText: true } };
      if (r < 2 || r === values.length - 1) cell.s = { ...cell.s, font: { name: "Calibri", sz: r === 0 ? 14 : 11, bold: true }, fill: { patternType: "solid", fgColor: { rgb: "E8EEF3" } } };
      if (c === 4 && r > 1) cell.z = "#,##0";
    }
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, options.list === "remaining" ? "Kalan Binalar" : "Tamamlanan Binalar");
  return workbook;
}
