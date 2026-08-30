import pdfParse from "pdf-parse/lib/pdf-parse.js";

export async function extractPdfText(buffer: Buffer) {
  const direct = await pdfParse(buffer);
  if (direct.text.replace(/\s/g, "").length < 30) {
    throw new Error(
      "Bu PDF taranmış görüntü içeriyor. Free Cloudflare sürümünde OCR kullanılamaz; metin seçilebilen bir PDF yükleyin.",
    );
  }
  return { text: direct.text, usedOcr: false };
}
