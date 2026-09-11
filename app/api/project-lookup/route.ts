import { requireUser } from "@/lib/auth";
import { findProjectLocations } from "@/lib/project-lookup";

export async function GET(request: Request) {
  try { await requireUser(request); }
  catch { return Response.json({ error: "Oturum gerekli." }, { status: 401 }); }
  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (query.length > 10000) return Response.json({ error: "Arama çok uzun." }, { status: 400 });
  try { return Response.json({ projects: await findProjectLocations(query) }, { headers: { "cache-control": "no-store" } }); }
  catch { return Response.json({ error: "Diğer proje türleri kontrol edilemedi." }, { status: 500 }); }
}
