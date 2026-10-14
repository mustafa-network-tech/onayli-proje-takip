import { guarded } from "@/lib/daily-report-api";
import { finalizeDraft } from "@/lib/daily-report";

// Saves the report only; Excel/PDF downloads are separate requests.
export function POST(request: Request) {
  return guarded(request, async () => Response.json(await finalizeDraft(), { status: 201 }));
}
