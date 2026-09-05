import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { completionCapture } from "@/lib/monthly-hp-sql";
import { executeSqlBatch } from "@/lib/sql-batch";

const schema = z.object({ field: z.enum(["cable", "splice", "obk"]), value: z.boolean() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const input = schema.parse(await request.json());
    const b = await db.hpBuilding.findUnique({ where: { id }, include: { project: true } });
    if (!b) return Response.json({ error: "Bina bulunamadı" }, { status: 404 });
    if (input.field === "obk" && b.project.projectType !== "BF") return Response.json({ error: "OBK yalnızca BF binalarında kullanılabilir" }, { status: 400 });
    if (input.field === "splice" && input.value && !b.cableCompleted) return Response.json({ error: "Kablo tamamlanmadan Ek tamamlanamaz" }, { status: 409 });
    if (input.field === "cable" && !input.value && b.spliceCompleted) return Response.json({ error: "Önce Ek işaretini kaldırın" }, { status: 409 });
    const map = { cable: ["cableCompleted", "cableCompletedAt", "Kablo"], splice: ["spliceCompleted", "spliceCompletedAt", "Ek"], obk: ["ibkCompleted", "ibkCompletedAt", "OBK"] } as const;
    const [flag, at, label] = map[input.field];
    const old = input.field === "obk" ? b.obkCompleted : input.field === "cable" ? b.cableCompleted : b.spliceCompleted;
    if (old === input.value) return Response.json({ ok: true });
    const now = Date.now();
    await executeSqlBatch([
      { sql: `UPDATE "HpBuilding" SET "${flag}"=?,"${at}"=?,"updatedAt"=? WHERE "id"=?`, values: [Number(input.value), input.value ? now : null, now, id] },
      { sql: 'INSERT INTO "HpBuildingHistory" ("id","buildingId","actionType","previousValue","newValue","description","createdBy","createdAt") VALUES (?,?,?,?,?,?,?,?)',
        values: [crypto.randomUUID(), id, `${input.field}_${input.value ? "completed" : "reopened"}`, String(old), String(input.value), `${label} ${input.value ? "tamamlandı" : "geri alındı"}`, user.id, now] },
      completionCapture("panel", id),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Geçersiz istek" }, { status: 400 });
  }
}
