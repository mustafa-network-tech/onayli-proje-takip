import { requireUser } from "@/lib/auth";
import { corporateFilterSchema, findCorporateProjects } from "@/lib/corporate";
import { corporateExcelBuffer } from "@/lib/corporate-export";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const params = new URL(request.url).searchParams;
    const filters = corporateFilterSchema.parse({ ...Object.fromEntries(params), district: params.getAll("district") });
    const rows = await findCorporateProjects(filters);
    const buffer = corporateExcelBuffer(rows, filters);
    return new Response(new Uint8Array(buffer), { headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="TTVPN-Projeleri-${filters.status}.xlsx"`, "cache-control": "no-store",
    } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Çıktı oluşturulamadı." }, { status: 400 }); }
}

export async function POST(request: Request) {
  try {
    await requireUser(request);
    const { ids } = z.object({ ids: z.array(z.string().min(1).max(100)).min(1).max(10000) }).parse(await request.json());
    const selected = new Set(ids);
    const rows = (await findCorporateProjects({ status: "all" })).filter(row => selected.has(row.id));
    if (rows.length !== selected.size) return Response.json({ error: "Seçilen bazı projeler bulunamadı. Listeyi yenileyip tekrar seçin." }, { status: 409 });
    const buffer = corporateExcelBuffer(rows, { selected: true });
    return new Response(new Uint8Array(buffer), { headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="TTVPN-Projeleri-Secilenler.xlsx"', "cache-control": "no-store",
    } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Seçilenlerin çıktısı oluşturulamadı." }, { status: 400 }); }
}
