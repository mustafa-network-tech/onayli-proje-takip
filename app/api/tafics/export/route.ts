import { findTaficsProjects } from "@/lib/tafics";
import { filterTaficsProjects, taficsFilterSchema } from "@/lib/tafics-shared";
import { taficsExcelBuffer } from "@/lib/tafics-export";
import { taficsAuthorization, taficsApiError } from "@/lib/tafics-api";

export async function GET(request: Request) {
  const unauthorized = await taficsAuthorization(request);
  if (unauthorized) return unauthorized;
  try {
    const filters = taficsFilterSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!filters.success) return Response.json({ error: "Geçersiz filtre." }, { status: 400 });
    const rows = filterTaficsProjects(await findTaficsProjects(), filters.data);
    return new Response(new Uint8Array(taficsExcelBuffer(rows)), { headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="TAFICS-Projeleri.xlsx"', "cache-control": "no-store",
    } });
  } catch (error) { return taficsApiError(error, "Excel oluşturulamadı. Lütfen tekrar deneyin."); }
}
