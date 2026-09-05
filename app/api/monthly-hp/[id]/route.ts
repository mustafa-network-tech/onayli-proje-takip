import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { validMonth } from "@/lib/monthly-hp-shared";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(request);
    const { id } = await params;
    const { month } = z.object({ month: z.string().refine(validMonth, "Geçerli bir ay seçin.") }).parse(await request.json());
    const changed = await db.$executeRaw`UPDATE "HpMonthlyCompletion" SET "month"=${month},"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${id}`;
    if (!changed) return Response.json({ error: "Aylık kayıt bulunamadı." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Ay kaydedilemedi." }, { status: 400 });
  }
}
