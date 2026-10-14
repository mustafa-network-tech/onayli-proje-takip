import {
  displayDate, formatHp, reportFileBase, sections, statusFill, statusLabel,
  computeTotals, type DailyItem, type DailyReportHead,
} from "./daily-report-shared";

// Browser-only: jsPDF is loaded on demand so it never enters the Worker bundle.
const rgb = (hex: string): [number, number, number] => [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

async function fontBase64(url: string) {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) throw new Error("PDF fontu yüklenemedi.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function pdfFileName(report: DailyReportHead) {
  return `${report.status === "FINAL" && report.reportDate ? reportFileBase(report.reportDate, report.sequence ?? 0) : "Bina_Raporu_Taslak"}.pdf`;
}

/** Builds the PDF from the stored report snapshot (never from live building data). */
export async function buildDailyReportPdf(report: DailyReportHead, items: DailyItem[]) {
  const [{ jsPDF }, { default: autoTable }, regular, bold] = await Promise.all([
    import("jspdf"), import("jspdf-autotable"),
    fontBase64("/fonts/NotoSans-Regular.ttf"), fontBase64("/fonts/NotoSans-Bold.ttf"),
  ]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.addFileToVFS("NotoSans-Regular.ttf", regular); doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", bold); doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  doc.setFont("NotoSans", "normal");

  const margin = 12, pageWidth = doc.internal.pageSize.getWidth(), pageHeight = doc.internal.pageSize.getHeight();
  const totals = report.status === "FINAL" && report.totalBuildings !== null ? {
    totalBuildings: report.totalBuildings, completedBuildings: report.completedBuildings ?? 0, completedHp: report.completedHp ?? 0,
    problemBuildings: report.problemBuildings ?? 0, problemHp: report.problemHp ?? 0,
    cancelledBuildings: report.cancelledBuildings ?? 0, cancelledHp: report.cancelledHp ?? 0,
  } : computeTotals(items);

  doc.setFont("NotoSans", "bold").setFontSize(16);
  doc.text(report.title ?? "Günlük Bina Raporu (TASLAK)", pageWidth / 2, margin + 6, { align: "center" });
  doc.setFont("NotoSans", "normal").setFontSize(9);
  const meta = report.finalizedAt
    ? `Rapor tarihi: ${displayDate(report.reportDate ?? "")} · Alınma zamanı: ${new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" }).format(new Date(report.finalizedAt))}`
    : "TASLAK — henüz kesinleşmedi";
  doc.text(meta, pageWidth / 2, margin + 12, { align: "center" });

  autoTable(doc, {
    startY: margin + 16, theme: "grid", margin: { left: margin, right: margin },
    styles: { font: "NotoSans", fontSize: 9, cellPadding: 1.6, lineColor: [82, 96, 109], lineWidth: 0.2, textColor: [23, 33, 43] },
    columnStyles: { 0: { cellWidth: 110, fontStyle: "bold" }, 1: { cellWidth: 40, halign: "right" }, 2: { cellWidth: 40 } },
    tableWidth: 190,
    body: [
      ["Toplam Bina (rapordaki)", String(totals.totalBuildings), "bina"],
      ["Toplam HP (tamamlanan)", formatHp(totals.completedHp), "HP"],
      ["Bekleyen Sorunlu HP (toplam HP'ye dahil değil)", formatHp(totals.problemHp), "HP"],
      ["İPTAL HP (toplam HP'ye dahil değil)", formatHp(totals.cancelledHp), "HP"],
      [`Tamamlanan: ${totals.completedBuildings} · Problemli: ${totals.problemBuildings} · İptal: ${totals.cancelledBuildings} bina`, "", ""],
    ],
    didParseCell: data => {
      data.cell.styles.fillColor = [242, 242, 242];
      if (data.row.index === 4 && data.column.index === 0) { data.cell.colSpan = 3; data.cell.styles.fontStyle = "normal"; }
    },
  });

  const columns = ["Proje ID", "Mahalle", "Bina Adresi", "HP Sayısı", "Durum", "Açıklama"];
  for (const section of sections(items)) {
    const previous = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    let startY = (previous?.finalY ?? margin) + 7;
    if (startY > pageHeight - 45) { doc.addPage(); startY = margin; }
    const sectionHp = section.items.reduce((sum, item) => sum + item.hp, 0);
    const body = section.items.length
      ? section.items.map(item => [item.projectId, item.neighborhood, item.address, formatHp(item.hp), statusLabel[item.status], item.note])
      : [[{ content: "Bu bölümde kayıt yok.", colSpan: 6, styles: { fontStyle: "italic" as const } }]];
    autoTable(doc, {
      startY, theme: "grid", margin: { left: margin, right: margin, bottom: 14 }, showHead: "everyPage", rowPageBreak: "avoid",
      styles: { font: "NotoSans", fontSize: 8.5, cellPadding: 1.8, lineColor: [82, 96, 109], lineWidth: 0.2, textColor: [23, 33, 43], overflow: "linebreak", valign: "top" },
      headStyles: { fillColor: [217, 217, 217], textColor: [23, 33, 43], fontStyle: "bold", halign: "center" },
      footStyles: { fillColor: [242, 242, 242], textColor: [23, 33, 43], fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 38 }, 2: { cellWidth: 80 }, 3: { cellWidth: 18, halign: "center" }, 4: { cellWidth: 24, halign: "center" }, 5: { cellWidth: 87 } },
      head: [
        [{ content: `${section.title} (${section.items.length} bina)`, colSpan: 6, styles: { halign: "left" as const, fontSize: 10 } }],
        columns,
      ],
      body,
      foot: [[{ content: section.status === "COMPLETED" ? `Ara toplam: ${section.items.length} bina` : section.status === "PROBLEM" ? `Bekleyen sorunlu: ${section.items.length} bina` : `İPTAL: ${section.items.length} bina`, colSpan: 3 },
        { content: formatHp(sectionHp), styles: { halign: "center" as const } }, section.status === "CANCELLED" ? "İPTAL" : "", ""]],
      showFoot: "lastPage",
      didParseCell: data => {
        if (data.section !== "body" || !section.items.length) return;
        const item = section.items[data.row.index];
        data.cell.styles.fillColor = rgb(statusFill[item.status]);
        if (item.status === "CANCELLED") data.cell.styles.textColor = [156, 0, 6];
      },
    });
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page).setFont("NotoSans", "normal").setFontSize(8).setTextColor(104, 117, 133);
    doc.text(`Sayfa ${page} / ${pages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
    doc.text(report.title ?? "Günlük Bina Raporu", margin, pageHeight - 6);
  }
  return doc;
}

export async function downloadDailyReportPdf(report: DailyReportHead, items: DailyItem[]) {
  const doc = await buildDailyReportPdf(report, items);
  doc.save(pdfFileName(report));
}
