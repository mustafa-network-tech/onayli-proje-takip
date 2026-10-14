import { guarded } from "@/lib/daily-report-api";
import { getReport } from "@/lib/daily-report";

export const dynamic = "force-dynamic";
export function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, async () => {
    const result = await getReport((await params).id);
    return result ? Response.json(result) : Response.json({ error: "Rapor bulunamadı." }, { status: 404 });
  });
}
