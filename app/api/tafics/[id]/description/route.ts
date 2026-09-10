import { db } from "@/lib/db";
import { taficsAuthorization, taficsApiError } from "@/lib/tafics-api";
import { z } from "zod";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await taficsAuthorization(request);
  if (unauthorized) return unauthorized;
  try {
    const { id } = await params;
    const input = z.object({ description: z.string().max(30000) }).strict().safeParse(await request.json());
    if (!z.uuid().safeParse(id).success || !input.success) return Response.json({ error: "Geçersiz kayıt veya açıklama. Açıklama en fazla 30.000 karakter olabilir." }, { status: 400 });
    const count = await db.$executeRaw`UPDATE "TaficsProject" SET "description"=${input.data.description},"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${id}`;
    if (!count) return Response.json({ error: "Proje bulunamadı." }, { status: 404 });
    return Response.json(input.data);
  } catch (error) { return taficsApiError(error, "Açıklama kaydedilemedi. Lütfen tekrar deneyin."); }
}
