import { requireUser } from "@/lib/auth";
import { previewCorporateImport } from "@/lib/corporate";

export async function POST(request: Request) {
  try {
    await requireUser(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx")) return Response.json({ error: "Bir .xlsx dosyası seçin." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return Response.json({ error: "Excel en fazla 10 MB olabilir." }, { status: 413 });
    return Response.json(await previewCorporateImport(Buffer.from(await file.arrayBuffer()), file.name));
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Dosya okunamadı." }, { status: 400 }); }
}
