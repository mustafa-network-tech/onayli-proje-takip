import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseProductionText } from "@/lib/production-parser";

const MAX_TEXT_LENGTH = 2 * 1024 * 1024;

type PreviewRequest = {
  fileName?: unknown;
  fingerprint?: unknown;
  text?: unknown;
};

export async function POST(request: Request) {
  try {
    await requireUser(request);
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_TEXT_LENGTH) {
      return Response.json({ error: "PDF metni çok büyük" }, { status: 413 });
    }

    const body = (await request.json()) as PreviewRequest;
    if (
      typeof body.fileName !== "string" ||
      !body.fileName.toLocaleLowerCase("tr-TR").endsWith(".pdf") ||
      typeof body.fingerprint !== "string" ||
      !/^[a-f0-9]{64}$/.test(body.fingerprint) ||
      typeof body.text !== "string" ||
      !body.text.trim()
    ) {
      return Response.json({ error: "PDF metni okunamadı" }, { status: 400 });
    }
    if (body.text.length > MAX_TEXT_LENGTH) {
      return Response.json({ error: "PDF metni çok büyük" }, { status: 413 });
    }

    const existing = await db.productionImport.findUnique({ where: { fingerprint: body.fingerprint } });
    const preview = parseProductionText(body.text, body.fileName, body.fingerprint);
    return Response.json({ ...preview, duplicate: Boolean(existing), usedOcr: false });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "PDF analiz edilemedi" },
      { status: 400 },
    );
  }
}
