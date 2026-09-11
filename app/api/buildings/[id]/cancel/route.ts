import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { executeSqlBatch } from "@/lib/sql-batch";
import { completionCapture } from "@/lib/monthly-hp-sql";
import { z } from "zod";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireUser(request); }
  catch { return Response.json({ error: "Oturum gerekli." }, { status: 401 }); }
  try {
    const input = z.object({ cancelled: z.boolean() }).strict().safeParse(await request.json());
    if (!input.success) return Response.json({ error: "Geçersiz iptal durumu." }, { status: 400 });
    const { id } = await params;
    const b = await db.hpBuilding.findUnique({ where: { id }, include: { project: true } });
    if (!b || !b.isActive || !["GF", "BF"].includes(b.project.projectType)) return Response.json({ error: "Bina bulunamadı." }, { status: 404 });
    if (b.isCancelled === input.data.cancelled) return Response.json({ ok: true });
    const now = Date.now();
    await executeSqlBatch([
      { sql: 'UPDATE "HpBuilding" SET "isCancelled"=?,"updatedAt"=? WHERE "id"=?', values: [Number(input.data.cancelled), now, id] },
      { sql: 'INSERT INTO "HpBuildingHistory" ("id","buildingId","actionType","previousValue","newValue","description","createdBy","createdAt") VALUES (?,?,?,?,?,?,?,?)',
        values: [crypto.randomUUID(), id, "cancellation_changed", String(b.isCancelled), String(input.data.cancelled), input.data.cancelled ? "Bina iptal edildi" : "Bina iptali geri alındı", user.id, now] },
      ...(!input.data.cancelled ? [completionCapture("panel", id)] : []),
    ]);
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "İptal durumu kaydedilemedi." }, { status: 400 }); }
}
