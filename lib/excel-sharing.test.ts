import { afterEach, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import { canShareExcel, downloadExcelFile, EXCEL_MIME, fetchExcelFile, shareExcelFile } from "./excel-sharing";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

function excelResponse(name = 'attachment; filename="TTVPN-Projeleri.xlsx"') {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["ID", "İlçe"], ["001", "BİGA-48"]]), "Projeler");
  return new Response(new Uint8Array(XLSX.write(book, { type: "buffer", bookType: "xlsx" })), {
    headers: { "content-type": EXCEL_MIME, "content-disposition": name },
  });
}
const file = () => new File(["test"], "Projeler.xlsx", { type: EXCEL_MIME });

it("prepares the actual Excel attachment with its filename and all URL filters unchanged", async () => {
  const response = excelResponse();
  const expected = await response.clone().arrayBuffer();
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  const url = "/api/corporate/export?district=B%C4%B0GA-48&district=LAPSEK%C4%B0-49&status=completed";
  const result = await fetchExcelFile(url);
  expect(fetchMock).toHaveBeenCalledWith(url, expect.objectContaining({ method: "GET", credentials: "same-origin", cache: "no-store" }));
  expect(result.name).toBe("TTVPN-Projeleri.xlsx");
  expect(result.type).toBe(EXCEL_MIME);
  expect(await result.arrayBuffer()).toEqual(expected);
});

it("posts only selected IDs and propagates the abort signal", async () => {
  const fetchMock = vi.fn().mockResolvedValue(excelResponse());
  vi.stubGlobal("fetch", fetchMock);
  const body = JSON.stringify({ ids: ["a", "b"] });
  const signal = new AbortController().signal;
  await fetchExcelFile("/api/corporate/export", { body, signal });
  expect(fetchMock).toHaveBeenCalledWith("/api/corporate/export", expect.objectContaining({ method: "POST", body, signal, headers: { "content-type": "application/json" } }));
});

it("rejects expired sessions, API errors and empty files instead of sharing them as Excel", async () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValueOnce(new Response("<html>Login</html>", { headers: { "content-type": "text/html" } }));
  await expect(fetchExcelFile("/export")).rejects.toThrow("Oturumunuzu");
  fetchMock.mockResolvedValueOnce(Response.json({ error: "Seçilen projeler bulunamadı" }, { status: 409 }));
  await expect(fetchExcelFile("/export")).rejects.toThrow("Seçilen projeler bulunamadı");
  fetchMock.mockResolvedValueOnce(new Response("", { headers: { "content-type": EXCEL_MIME } }));
  await expect(fetchExcelFile("/export")).rejects.toThrow("boş");
});

it("decodes UTF-8 attachment names and keeps them safe for download", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(excelResponse("attachment; filename*=UTF-8''%C4%B0l%C3%A7e%2FRapor.xlsx")));
  expect((await fetchExcelFile("/export")).name).toBe("İlçe_Rapor.xlsx");
});

it("opens native sharing synchronously with the file and no private export URL", async () => {
  const attachment = file();
  const share = vi.fn().mockResolvedValue(undefined);
  const canShare = vi.fn().mockReturnValue(true);
  vi.stubGlobal("navigator", { share, canShare });
  const result = shareExcelFile(attachment);
  expect(share).toHaveBeenCalledWith({ files: [attachment] });
  expect(canShare).toHaveBeenCalledWith({ files: [attachment] });
  await expect(result).resolves.toBe("shared");
});

it("offers fallback when the browser cannot share Excel files", async () => {
  const share = vi.fn();
  vi.stubGlobal("navigator", { share, canShare: () => false });
  await expect(shareExcelFile(file())).resolves.toBe("unsupported");
  expect(share).not.toHaveBeenCalled();
  vi.stubGlobal("navigator", {});
  expect(canShareExcel(file())).toBe(false);
  vi.stubGlobal("navigator", { share, canShare: () => { throw new Error("Blocked"); } });
  expect(canShareExcel(file())).toBe(false);
});

it("handles cancellation without claiming success or automatically downloading", async () => {
  const share = vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError"));
  vi.stubGlobal("navigator", { share, canShare: () => true });
  await expect(shareExcelFile(file())).resolves.toBe("cancelled");
  share.mockRejectedValue(new DOMException("Blocked", "NotAllowedError"));
  await expect(shareExcelFile(file())).rejects.toThrow("Blocked");
});

it("downloads the prepared file and releases the object URL afterwards", () => {
  vi.useFakeTimers();
  const attachment = file();
  const link = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
  vi.stubGlobal("document", { createElement: vi.fn().mockReturnValue(link), body: { appendChild: vi.fn() } });
  const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  downloadExcelFile(attachment);
  expect(create).toHaveBeenCalledWith(attachment);
  expect(link.download).toBe("Projeler.xlsx");
  expect(link.click).toHaveBeenCalledOnce();
  expect(link.remove).toHaveBeenCalledOnce();
  expect(revoke).not.toHaveBeenCalled();
  vi.runAllTimers();
  expect(revoke).toHaveBeenCalledWith("blob:test");
});
