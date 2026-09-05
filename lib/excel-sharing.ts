export const EXCEL_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function fetchExcelFile(url: string, options: { body?: string; signal?: AbortSignal } = {}): Promise<File> {
  const response = await fetch(url, {
    method: options.body === undefined ? "GET" : "POST",
    ...(options.body === undefined ? {} : { headers: { "content-type": "application/json" }, body: options.body }),
    credentials: "same-origin", cache: "no-store", signal: options.signal,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(typeof result?.error === "string" ? result.error : "Excel dosyası hazırlanamadı. Tekrar deneyin.");
  }
  if (response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== EXCEL_MIME) {
    throw new Error("Excel dosyası alınamadı. Oturumunuzu kontrol edip tekrar deneyin.");
  }
  const disposition = response.headers.get("content-disposition") ?? "";
  let name = /filename="([^"]+)"/i.exec(disposition)?.[1] ?? "Projeler.xlsx";
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  if (encoded) { try { name = decodeURIComponent(encoded); } catch { /* Keep the plain filename. */ } }
  name = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_");
  if (!name.toLowerCase().endsWith(".xlsx")) name = "Projeler.xlsx";
  const blob = await response.blob();
  if (!blob.size) throw new Error("Excel dosyası boş. Tekrar deneyin.");
  return new File([blob], name, { type: EXCEL_MIME });
}

export function canShareExcel(file: File): boolean {
  try {
    return typeof navigator !== "undefined" && typeof navigator.share === "function"
      && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  } catch { return false; }
}

// Call directly from a click after preparing the file, preserving browser user activation.
export async function shareExcelFile(file: File): Promise<"shared" | "cancelled" | "unsupported"> {
  if (!canShareExcel(file)) return "unsupported";
  try {
    await navigator.share({ files: [file] });
    return "shared";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "cancelled";
    throw error;
  }
}

export function downloadExcelFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url; link.download = file.name;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
