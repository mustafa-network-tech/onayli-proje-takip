import { deleteTaficsProject, updateTaficsProject } from "@/lib/tafics";
import { taficsSchema } from "@/lib/tafics-shared";
import { taficsAuthorization, taficsApiError } from "@/lib/tafics-api";
import { z } from "zod";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  const unauthorized = await taficsAuthorization(request);
  if (unauthorized) return unauthorized;
  try {
    const { id } = await params;
    const input = taficsSchema.safeParse(await request.json());
    if (!z.uuid().safeParse(id).success || !input.success) return Response.json({ error: "Alanları kontrol edin. İl ve Proje Adı gerekli; metrajlar geçerli, negatif olmayan sayılar olmalıdır." }, { status: 400 });
    if (!await updateTaficsProject(id, input.data)) return Response.json({ error: "Proje bulunamadı. Listeyi yenileyin." }, { status: 404 });
    return Response.json({ project: { ...input.data, id } });
  } catch (error) { return taficsApiError(error, "Proje güncellenemedi. Lütfen tekrar deneyin."); }
}
export async function DELETE(request: Request, { params }: Context) {
  const unauthorized = await taficsAuthorization(request);
  if (unauthorized) return unauthorized;
  try {
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) return Response.json({ error: "Geçersiz kayıt." }, { status: 400 });
    const confirmation = z.object({ confirmed: z.literal(true) }).strict().safeParse(await request.json());
    if (!confirmation.success) return Response.json({ error: "Silme onayı gerekli." }, { status: 400 });
    if (!await deleteTaficsProject(id)) return Response.json({ error: "Proje bulunamadı. Listeyi yenileyin." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) { return taficsApiError(error, "Proje silinemedi. Lütfen tekrar deneyin."); }
}
