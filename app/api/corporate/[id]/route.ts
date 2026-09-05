import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const changeSchema = z.union([
  z.object({ field: z.enum(["cable", "splice"]), value: z.boolean() }).strict(),
  z.object({ note: z.string().trim().max(2000) }).strict(),
]);
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(request);
    const { id } = await params;
    const input = changeSchema.parse(await request.json());
    let count: number;
    if ("field" in input) {
      count = input.field === "cable"
        ? await db.$executeRaw`UPDATE "CorporateProject" SET "cableCompleted"=${Number(input.value)},"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${id}`
        : await db.$executeRaw`UPDATE "CorporateProject" SET "spliceCompleted"=${Number(input.value)},"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${id}`;
    } else {
      count = await db.$executeRaw`UPDATE "CorporateProject" SET "note"=${input.note},"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${id}`;
    }
    if (!count) return Response.json({ error: "Kurumsal kayıt bulunamadı." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Kayıt güncellenemedi." }, { status: 400 }); }
}
