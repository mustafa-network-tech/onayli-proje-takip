import { createTaficsProject } from "@/lib/tafics";
import { taficsSchema } from "@/lib/tafics-shared";
import { taficsAuthorization, taficsApiError } from "@/lib/tafics-api";

export async function POST(request: Request) {
  const unauthorized = await taficsAuthorization(request);
  if (unauthorized) return unauthorized;
  try {
    const input = taficsSchema.safeParse(await request.json());
    if (!input.success) return Response.json({ error: "Alanları kontrol edin. İl ve Proje Adı gerekli; metrajlar geçerli, negatif olmayan sayılar olmalıdır." }, { status: 400 });
    return Response.json({ project: await createTaficsProject(input.data) }, { status: 201 });
  } catch (error) { return taficsApiError(error, "Proje kaydedilemedi. Lütfen tekrar deneyin."); }
}
