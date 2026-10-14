import { guarded } from "@/lib/daily-report-api";
import { getReport } from "@/lib/daily-report";
import { dailyReportExcelBuffer } from "@/lib/daily-report-excel";
import { reportFileBase } from "@/lib/daily-report-shared";

export const dynamic = "force-dynamic";
// Built only from the stored snapshot, so history downloads never change.
export function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, async () => {
    const result = await getReport((await params).id);
    if (!result) return Response.json({ error: "Rapor bulunamadı." }, { status: 404 });
    const { report, items } = result;
    const base = report.status === "FINAL" && report.reportDate ? reportFileBase(report.reportDate, report.sequence ?? 0) : "Bina_Raporu_Taslak";
    return new Response(new Uint8Array(dailyReportExcelBuffer(report, items)), { headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${base}.xlsx"`,
    } });
  });
}
