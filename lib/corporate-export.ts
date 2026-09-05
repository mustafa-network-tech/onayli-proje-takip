import * as XLSX from "xlsx-js-style";
import { corporateStatus, type CorporateProjectRow, type CorporateFilters } from "./corporate-shared";

export function corporateWorkbook(rows: CorporateProjectRow[], options: Partial<CorporateFilters> & { selected?: boolean } = {}) {
  const labels = { all: "Tüm Projeler", completed: "Tamamlanan Projeler", ongoing: "Devam Eden Projeler", not_started: "Başlanmayan Projeler" };
  const subtitle = [options.selected ? "Seçilen Projeler" : labels[options.status ?? "all"], options.district?.length ? `İlçe: ${options.district.join(", ")}` : "", options.q ? `Arama: ${options.q}` : "", `${rows.length} proje`].filter(Boolean).join(" · ");
  const data = [
    ["TTVPN PROJELERİ", "", "", "", "", "", ""],
    [subtitle, "", "", "", "", "", ""],
    ["İlçe", "Adres", "ID", "Kablo", "Ek", "Durum", "Not"],
    ...rows.map(row => [row.district ?? "", row.address ?? "", row.projectId,
      row.cableCompleted ? "Yapıldı" : "Yapılmadı", row.spliceCompleted ? "Yapıldı" : "Yapılmadı", corporateStatus(row).label, row.note]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const widths = [18, 40, 14, 10, 10, 16, 30];
  sheet["!cols"] = widths.map(wch => ({ wch }));
  const subtitleHeight = Math.min(409, Math.max(28, Math.ceil(subtitle.length / 120) * 16 + 8));
  sheet["!rows"] = [{ hpt: 28 }, { hpt: subtitleHeight }, { hpt: 25 }, ...data.slice(3).map(cells => ({
    hpt: Math.min(409, Math.max(30, ...cells.map((value, column) =>
      String(value).split(/\r\n|\r|\n/).reduce((lines, line) => lines + Math.max(1, Math.ceil(line.length / (widths[column] - 4))), 0) * 16 + 8))),
  }))];
  sheet["!margins"] = { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 };
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
  workbook.Workbook = { Names: [
    { Name: "_xlnm.Print_Area", Sheet: 0, Ref: `'TTVPN PROJELERİ'!$A$1:$G$${data.length}` },
    { Name: "_xlnm.Print_Titles", Sheet: 0, Ref: "'TTVPN PROJELERİ'!$1:$3" },
  ] };
  return workbook;
}

export function corporateExcelBuffer(rows: CorporateProjectRow[], options: Parameters<typeof corporateWorkbook>[1] = {}): Buffer {
  const buffer = XLSX.write(corporateWorkbook(rows, options), { type: "buffer", bookType: "xlsx" });
  // xlsx-js-style does not serialize pageSetup. Add the print settings to the worksheet XML.
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
