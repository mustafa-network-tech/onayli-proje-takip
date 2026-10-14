import { guarded } from "@/lib/daily-report-api";
import { getDraft, listHistory } from "@/lib/daily-report";

export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return guarded(request, async () => Response.json({ draft: await getDraft(), history: await listHistory() }));
}
