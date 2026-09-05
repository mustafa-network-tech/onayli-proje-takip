"use client";

import { useEffect, useId, useRef, useState } from "react";
import { canShareExcel, downloadExcelFile, fetchExcelFile, shareExcelFile } from "@/lib/excel-sharing";

export default function ExcelShareButton({ url, body, label = "Excel Paylaş", disabled = false }: {
  url: string; body?: Record<string, unknown>; label?: string; disabled?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef<AbortController | null>(null);
  const heading = useId();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false), [sharing, setSharing] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const serializedBody = body === undefined ? undefined : JSON.stringify(body);
  useEffect(() => {
    const element = dialog.current;
    return () => { pending.current?.abort(); element?.close(); };
  }, [url, serializedBody]);

  async function prepare() {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setFile(null); setError(""); setNotice(""); setLoading(true);
    dialog.current?.showModal();
    try {
      const result = await fetchExcelFile(url, { body: serializedBody, signal: controller.signal });
      if (!controller.signal.aborted) setFile(result);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Excel dosyası hazırlanamadı.");
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }

  async function share() {
    if (!file || sharing) return;
    setSharing(true); setError(""); setNotice("");
    try {
      const result = await shareExcelFile(file);
      setNotice(result === "shared" ? "Dosya cihazın paylaşım menüsüne aktarıldı."
        : result === "cancelled" ? "Paylaşım iptal edildi veya uygun uygulama bulunamadı. Yeniden deneyebilir ya da Excel’i indirebilirsiniz."
        : "Bu tarayıcı Excel dosyası paylaşımını desteklemiyor. Dosyayı indirip WhatsApp’ta belge olarak ekleyin.");
    } catch {
      setError("Paylaşım açılamadı. Yeniden deneyebilir ya da Excel’i indirip WhatsApp’ta belge olarak ekleyebilirsiniz.");
    } finally { setSharing(false); }
  }

  const supported = file ? canShareExcel(file) : false;
  return <>
    <button type="button" className="excel-share-button" disabled={disabled || loading || sharing} onClick={prepare}>{label}</button>
    <dialog ref={dialog} className="excel-share-dialog" aria-labelledby={heading}
      onCancel={event => { if (sharing) event.preventDefault(); }}
      onClose={() => { pending.current?.abort(); setFile(null); setLoading(false); }}>
      <h2 id={heading}>Excel Dosyasını Paylaş</h2>
      {loading && <p role="status">Excel hazırlanıyor…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {file && <>
        <p className="excel-share-filename">{file.name}</p>
        <p>{supported ? "Paylaşım menüsünde WhatsApp’ı ve alıcıyı seçin. WhatsApp görünmüyorsa dosyayı indirip belge olarak ekleyebilirsiniz."
          : "Bu tarayıcı Excel dosyası paylaşımını desteklemiyor. Excel’i indirin; WhatsApp’ta sohbeti açıp ataç / + → Belge ile dosyayı ekleyin."}</p>
        <div className="filters">
          {supported && <button type="button" disabled={sharing} onClick={share}>{sharing ? "Paylaşım açılıyor…" : "WhatsApp / Paylaş"}</button>}
          <button type="button" className="secondary" disabled={sharing} onClick={() => downloadExcelFile(file)}>Excel’i İndir</button>
          <a className="button" href="https://web.whatsapp.com/" target="_blank" rel="noopener noreferrer">WhatsApp Web’i Aç</a>
        </div>
      </>}
      {notice && <p role="status">{notice}</p>}
      {!loading && !file && <button type="button" onClick={prepare}>Tekrar Dene</button>}
      <button type="button" className="secondary" disabled={sharing} onClick={() => dialog.current?.close()}>Kapat</button>
    </dialog>
  </>;
}
