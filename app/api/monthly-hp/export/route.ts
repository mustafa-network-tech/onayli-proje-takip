import * as XLSX from "xlsx-js-style";
import { requireUser } from "@/lib/auth";
import { findMonthlyHpRows, reportFilters } from "@/lib/monthly-hp";
import { monthlyHpWorkbook } from "@/lib/monthly-hp-export";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const params = new URL(request.url).searchParams;
    const filters = reportFilters({ month: params.get("month") ?? undefined, type: params.get("type") ?? undefined, list: params.get("list") ?? undefined });
    const rows = await findMonthlyHpRows(filters);
    const workbook = monthlyHpWorkbook(rows, filters);
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const name = `HP-${filters.scope}-${filters.list === "remaining" ? "Kalan-Guncel" : `Tamamlanan-${filters.month}`}.xlsx`;
    return new Response(new Uint8Array(buffer), { headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store",
    } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Çıktı hazırlanamadı." }, { status: 400 });
  }
}
