import * as XLSX from "xlsx-js-style";
import { taficsHeaders, taficsTotals, type TaficsRow } from "./tafics-shared";

export function taficsWorkbook(rows: TaficsRow[]) {
  const totals = taficsTotals(rows);
  const headers = taficsHeaders.filter(header => header !== "PROJE TÜRÜ");
  const data = [headers, ...rows.map((row, index) => [index + 1, row.province, row.projectName,
    row.underground, row.cable, row.horizontalDrilling, row.permissionStatus, row.completionStatus, row.description]),
  ["", "", "TOPLAM", totals.underground, totals.cable, totals.horizontalDrilling, "", "", ""]];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const widths = [5, 13, 34, 11, 11, 12, 15, 17, 36];
  sheet["!cols"] = widths.map(wch => ({ wch }));
  sheet["!rows"] = [{ hpt: 28 }, ...rows.map(() => ({ hpt: 18 })), { hpt: 30 }];
  sheet["!margins"] = { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 };
  sheet["!autofilter"] = { ref: `A1:I${rows.length + 1}` };
  for (let r = 0; r < data.length; r++) for (let c = 0; c < headers.length; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c })];
    const header = r === 0, total = r === data.length - 1;
    cell.s = { font: { name: "Calibri", sz: 10, bold: header || total, color: { rgb: header ? "FFFFFF" : "17212B" } },
      fill: { fgColor: { rgb: header ? "175D8D" : total ? "DFF3E8" : r % 2 ? "FFFFFF" : "F3F6F9" } },
      alignment: { vertical: "top", wrapText: true, horizontal: c >= 3 && c <= 5 ? "right" : "left" },
      border: { bottom: { style: "thin", color: { rgb: "DCE3EA" } } } };
    if (r > 0 && c >= 3 && c <= 5) cell.z = "#,##0.############";
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "TAFICS");
  workbook.Workbook = { Names: [
    { Name: "_xlnm.Print_Area", Sheet: 0, Ref: `'TAFICS'!$A$1:$I$${data.length}` },
    { Name: "_xlnm.Print_Titles", Sheet: 0, Ref: "'TAFICS'!$1:$1" },
  ] };
  return workbook;
}
export function taficsExcelBuffer(rows: TaficsRow[]) {
  const buffer = XLSX.write(taficsWorkbook(rows), { type: "buffer", bookType: "xlsx", compression: true });
  // Match the existing corporate exporter: this library omits pageSetup,
  // so persist actual Excel print settings directly in the worksheet XML.
  const archive = XLSX.CFB.read(buffer, { type: "buffer" });
  const path = "/xl/worksheets/sheet1.xml";
  const entry = XLSX.CFB.find(archive, path);
  const xml = Buffer.from(entry.content).toString("utf8")
    .replace(/(<worksheet\b[^>]*>)/, '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>')
    .replace(/(<pageMargins\b[^>]*\/>)/, '$1<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>');
  if (!xml.includes('<pageSetup paperSize="9"')) throw new Error("Excel sayfa ayarları oluşturulamadı.");
  XLSX.CFB.utils.cfb_add(archive, path, Buffer.from(xml, "utf8"));
  return XLSX.CFB.write(archive, { type: "buffer", fileType: "zip", compression: true });
}
