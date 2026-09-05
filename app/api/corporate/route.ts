import { requireUser } from "@/lib/auth";
import { corporateCreateSchema, createCorporateProject } from "@/lib/corporate";

export async function POST(request: Request) {
  try {
    await requireUser(request);
    const input = corporateCreateSchema.safeParse(await request.json());
    if (!input.success) return Response.json({ error: input.error.issues[0].message }, { status: 400 });
    const id = await createCorporateProject(input.data);
    if (!id) return Response.json({ error: "Bu ID ile bir Kurumsal proje zaten var. Farklı bir ID girin veya mevcut projeyi düzenleyin." }, { status: 409 });
    return Response.json({ ok: true, id, projectId: input.data.projectId }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Proje eklenemedi." }, { status: 400 });
  }
}
