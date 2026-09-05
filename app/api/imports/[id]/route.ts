import { requireUser } from "@/lib/auth";
import { deleteExcelImport } from "@/lib/delete-import";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(request);
    const { id } = await params;
    const result = await deleteExcelImport(id);
    if (!result) return Response.json({ error: "Excel import kaydı bulunamadı" }, { status: 404 });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Silme işlemi başarısız" }, { status: 400 });
  }
}
