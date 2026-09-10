import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireUser(request); }
  catch { return Response.json({ error: "Oturum gerekli." }, { status: 401 }); }
  try {
    const input = z.object({ description: z.string().max(30000) }).strict().safeParse(await request.json());
    if (!input.success) return Response.json({ error: "Açıklama en fazla 30.000 karakter olabilir." }, { status: 400 });
    const { id } = await params;
    const noteId = new URL(request.url).searchParams.get("noteId");
    if (!noteId) return Response.json({ error: "Not seçilmedi." }, { status: 400 });
    const result = await db.hpBuildingNote.updateMany({ where: { id: noteId, buildingId: id }, data: { note: input.data.description } });
    if (!result.count) return Response.json({ error: "Not bulunamadı." }, { status: 404 });
    return Response.json(input.data);
  } catch { return Response.json({ error: "Açıklama kaydedilemedi. Lütfen tekrar deneyin." }, { status: 400 }); }
}
