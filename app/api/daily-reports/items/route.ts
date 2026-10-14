import { guarded, jsonBody } from "@/lib/daily-report-api";
import { addItems, DailyReportError } from "@/lib/daily-report";

export function POST(request: Request) {
  return guarded(request, async () => {
    const body = await jsonBody(request);
    const ids = body.buildingIds;
    if (!Array.isArray(ids) || ids.some(id => typeof id !== "string")) throw new DailyReportError("Bina seçilmedi.");
    return Response.json(await addItems(ids as string[], body.status, body.note), { status: 201 });
  }, true);
}
