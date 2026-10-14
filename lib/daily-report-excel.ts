import * as XLSX from "xlsx-js-style";
import {
  computeTotals, displayDate, sections, statusFill, statusLabel,
  type DailyItem, type DailyReportHead, type Totals,
} from "./daily-report-shared";

export const dailyColumns = ["Proje ID", "Mahalle", "Bina Adresi", "HP Sayısı", "Durum", "Açıklama"] as const;
const widths = [16, 22, 46, 10, 13, 50];
const COLS = dailyColumns.length;

/** Finalized reports show the totals stored at finalization; drafts are computed live. */
export function reportTotals(report: DailyReportHead, items: DailyItem[]): Totals {
  if (report.status === "FINAL" && report.totalBuildings !== null) {
    return {
      totalBuildings: report.totalBuildings, completedBuildings: report.completedBuildings ?? 0, completedHp: report.completedHp ?? 0,
      problemBuildings: report.problemBuildings ?? 0, problemHp: report.problemHp ?? 0,
      cancelledBuildings: report.cancelledBuildings ?? 0, cancelledHp: report.cancelledHp ?? 0,
    };
  }
  return computeTotals(items);
}

export function finalizedStamp(report: DailyReportHead) {
  if (!report.finalizedAt) return "TASLAK — henüz kesinleşmedi";
  const text = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" }).format(new Date(report.finalizedAt));
  return `Rapor tarihi: ${displayDate(report.reportDate ?? "")} · Alınma zamanı: ${text}`;
}

// Excel does not auto-fit wrapped text when a file is generated, so row heights are estimated.
function lines(text: string, width: number) {
  return text.split(/\r?\n/).reduce((total, part) => total + Math.max(1, Math.ceil(part.length / Math.max(1, width - 2))), 0);
}
const rowHeight = (cells: string[]) => Math.max(20, Math.max(...cells.map((text, i) => lines(text, widths[i]))) * 15 + 5);

export function dailyReportWorkbook(report: DailyReportHead, items: DailyItem[]) {
  const totals = reportTotals(report, items);
  const rows: (string | number)[][] = [];
  const heights: number[] = [];
  const merges: XLSX.Range[] = [];
  const kinds: ("title" | "meta" | "summary" | "section" | "head" | "item" | "subtotal" | "empty" | "gap")[] = [];
  const itemRef: (DailyItem | null)[] = [];
  const push = (kind: (typeof kinds)[number], values: (string | number)[], height: number, merge?: [number, number], item: DailyItem | null = null) => {
    const r = rows.length;
    rows.push([...values, ...Array(COLS - values.length).fill("")]);
    heights.push(height); kinds.push(kind); itemRef.push(item);
    if (merge) merges.push({ s: { r, c: merge[0] }, e: { r, c: merge[1] } });
  };

  const title = report.title ?? `Günlük Bina Raporu${report.status === "DRAFT" ? " (TASLAK)" : ""}`;
  push("title", [title], 30, [0, COLS - 1]);
  push("meta", [finalizedStamp(report)], 20, [0, COLS - 1]);
  push("gap", [], 8);
  const summary: [string, number, string][] = [
    ["Toplam Bina (rapordaki)", totals.totalBuildings, "bina"],
    ["Toplam HP (tamamlanan)", totals.completedHp, "HP"],
    ["Bekleyen Sorunlu HP (toplam HP'ye dahil değil)", totals.problemHp, "HP"],
    ["İPTAL HP (toplam HP'ye dahil değil)", totals.cancelledHp, "HP"],
  ];
  for (const [label, value, unit] of summary) {
    push("summary", [label, "", "", value, unit], 22, undefined);
    merges.push({ s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 2 } });
  }
  const counts = `Tamamlanan: ${totals.completedBuildings} bina · Problemli: ${totals.problemBuildings} bina · İptal: ${totals.cancelledBuildings} bina`;
  push("meta", [counts], 20, [0, COLS - 1]);

  for (const section of sections(items)) {
    const sectionItems = section.items;
    const sectionHp = sectionItems.reduce((sum, item) => sum + item.hp, 0);
    push("gap", [], 10);
    push("section", [`${section.title} (${sectionItems.length} bina)`], 24, [0, COLS - 1]);
    push("head", [...dailyColumns], 22);
    if (!sectionItems.length) push("empty", ["Bu bölümde kayıt yok."], 20, [0, COLS - 1]);
    for (const item of sectionItems) {
      const values = [`${item.projectId}`, item.neighborhood, item.address, item.hp, statusLabel[item.status], item.note];
      push("item", values, rowHeight(values.map(String)), undefined, item);
    }
    const label = section.status === "COMPLETED" ? `Ara toplam: ${sectionItems.length} bina`
      : section.status === "PROBLEM" ? `Bekleyen sorunlu: ${sectionItems.length} bina` : `İPTAL: ${sectionItems.length} bina`;
    push("subtotal", [label, "", "", sectionHp, section.status === "CANCELLED" ? "İPTAL" : ""], 22);
    merges.push({ s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 2 } });
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = widths.map(wch => ({ wch }));
  sheet["!rows"] = heights.map(hpt => ({ hpt }));
  sheet["!merges"] = merges;
  const thin = { style: "thin", color: { rgb: "52606D" } } as const;
  const border = { top: thin, bottom: thin, left: thin, right: thin };
  const font = (extra: object = {}) => ({ name: "Calibri", sz: 10, color: { rgb: "17212B" }, ...extra });
  const fill = (rgb: string) => ({ patternType: "solid", fgColor: { rgb } });

  rows.forEach((_, r) => {
    const kind = kinds[r];
    for (let c = 0; c < COLS; c++) {
      const address = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[address] ?? (sheet[address] = { t: "s", v: "" });
      const base = { alignment: { vertical: "center", wrapText: true, horizontal: "left" } } as Record<string, unknown>;
      if (kind === "title") cell.s = { ...base, font: font({ sz: 15, bold: true }), alignment: { vertical: "center", horizontal: "center" } };
      else if (kind === "meta") cell.s = { ...base, font: font({ sz: 10, italic: true }), alignment: { vertical: "center", horizontal: "center" } };
      else if (kind === "gap") cell.s = {};
      else if (kind === "summary") cell.s = { ...base, font: font({ bold: true, sz: 11 }), fill: fill("F2F2F2"), border, alignment: { vertical: "center", horizontal: c === 3 ? "right" : "left" } };
      else if (kind === "section") cell.s = { ...base, font: font({ bold: true, sz: 12 }), fill: fill("D9D9D9"), border };
      else if (kind === "head") cell.s = { ...base, font: font({ bold: true }), fill: fill("D9D9D9"), border, alignment: { vertical: "center", horizontal: "center", wrapText: true } };
      else if (kind === "empty") cell.s = { ...base, font: font({ italic: true }), border };
      else if (kind === "subtotal") cell.s = { ...base, font: font({ bold: true }), fill: fill("F2F2F2"), border, alignment: { vertical: "center", horizontal: c === 3 ? "right" : "left" } };
      else {
        const item = itemRef[r]!;
        cell.s = { ...base, font: font(item.status === "CANCELLED" ? { color: { rgb: "9C0006" } } : {}), fill: fill(statusFill[item.status]), border,
          alignment: { vertical: "top", wrapText: true, horizontal: c === 3 || c === 4 ? "center" : "left" } };
      }
      if (c === 3 && (kind === "item" || kind === "subtotal" || kind === "summary") && typeof cell.v === "number") cell.z = "#,##0";
    }
  });

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Günlük Bina Raporu");
  book.Workbook = { Names: [{ Name: "_xlnm.Print_Area", Sheet: 0, Ref: `'Günlük Bina Raporu'!$A$1:$F$${rows.length}` }] };
  return book;
}

export function dailyReportExcelBuffer(report: DailyReportHead, items: DailyItem[]) {
  const book = dailyReportWorkbook(report, items);
  book.Sheets[book.SheetNames[0]]["!margins"] = { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 };
  const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx", compression: true });
  // xlsx-js-style omits pageSetup: persist A4 landscape / fit-to-width in the sheet XML.
  const archive = XLSX.CFB.read(buffer, { type: "buffer" });
  const path = "/xl/worksheets/sheet1.xml";
  const entry = XLSX.CFB.find(archive, path);
  const xml = Buffer.from(entry.content).toString("utf8")
    .replace(/(<worksheet\b[^>]*>)/, '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>')
    .replace(/(<pageMargins\b[^>]*\/>)/, '$1<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>');
  if (!xml.includes('<pageSetup paperSize="9"')) throw new Error("Excel sayfa ayarları oluşturulamadı.");
  XLSX.CFB.utils.cfb_add(archive, path, Buffer.from(xml, "utf8"));
  return XLSX.CFB.write(archive, { type: "buffer", fileType: "zip", compression: true }) as Buffer;
}
