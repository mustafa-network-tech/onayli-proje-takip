import * as XLSX from "xlsx-js-style";
import { taficsHeaders, taficsTotals, type TaficsRow } from "./tafics-shared";

export function taficsWorkbook(rows: TaficsRow[]) {
  const totals = taficsTotals(rows);
  const data = [taficsHeaders, ...rows.map((row, index) => [index + 1, row.province, row.projectName, row.projectType,
    row.underground, row.cable, row.horizontalDrilling, row.permissionStatus, row.completionStatus, row.description]),
  ["", "", "TOPLAM", "", totals.underground, totals.cable, totals.horizontalDrilling, "", "", ""]];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet["!cols"] = [7, 22, 55, 22, 18, 18, 20, 22, 24, 65].map(wch => ({ wch }));
  sheet["!autofilter"] = { ref: `A1:J${rows.length + 1}` };
  for (let r = 0; r < data.length; r++) for (let c = 0; c < 10; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c })];
    const header = r === 0, total = r === data.length - 1;
    cell.s = { font: { name: "Calibri", sz: 11, bold: header || total, color: { rgb: header ? "FFFFFF" : "17212B" } },
      fill: { fgColor: { rgb: header ? "175D8D" : total ? "DFF3E8" : r % 2 ? "FFFFFF" : "F3F6F9" } },
      alignment: { vertical: "top", wrapText: true, horizontal: c >= 4 && c <= 6 ? "right" : "left" },
      border: { bottom: { style: "thin", color: { rgb: "DCE3EA" } } } };
    if (r > 0 && c >= 4 && c <= 6) cell.z = "#,##0.############";
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "TAFICS");
  return workbook;
}
export function taficsExcelBuffer(rows: TaficsRow[]) {
  return XLSX.write(taficsWorkbook(rows), { type: "buffer", bookType: "xlsx", compression: true });
}
