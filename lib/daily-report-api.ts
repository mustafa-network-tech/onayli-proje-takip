import { requireUser } from "./auth";
import { DailyReportError } from "./daily-report";

/** Shared guard: session required, JSON write bodies only, errors mapped to JSON. */
export async function guarded(request: Request, run: () => Promise<Response>, write = false) {
  try { await requireUser(request); }
  catch { return Response.json({ error: "Oturum gerekli." }, { status: 401 }); }
  if (write && request.method !== "DELETE" && !(request.headers.get("content-type") ?? "").includes("application/json")) {
    return Response.json({ error: "Geçersiz istek." }, { status: 415 });
  }
  try {
    const response = await run();
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof DailyReportError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "İşlem tamamlanamadı. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new DailyReportError("Geçersiz istek.");
  return body as Record<string, unknown>;
}
