import { guarded } from "@/lib/daily-report-api";
import { DailyReportError, searchBuildings } from "@/lib/daily-report";

export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return guarded(request, async () => {
    const params = new URL(request.url).searchParams;
    const type = params.get("type");
    if (type !== "GF" && type !== "BF") throw new DailyReportError("Proje türü GF veya BF olmalıdır.");
    const query = params.get("q") ?? "";
    if (query.length > 2000) throw new DailyReportError("Arama çok uzun.");
    return Response.json({ buildings: await searchBuildings(type, query) });
  });
}
