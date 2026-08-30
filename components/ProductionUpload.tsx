"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductionEntryInput, ProductionPreview } from "@/lib/production-types";

const MAX_PDF_SIZE = 15 * 1024 * 1024;

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const document = await loadingTask.promise;
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        text += item.str;
        text += item.hasEOL ? "\n" : " ";
      }
      pages.push(text);
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }
  return pages.join("\n");
}

export default function ProductionUpload() {
  const router = useRouter();
  const [preview, setPreview] = useState<ProductionPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function analyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const file = new FormData(event.currentTarget).get("file");
      if (!(file instanceof File) || !file.name.toLocaleLowerCase("tr-TR").endsWith(".pdf")) {
        throw new Error("Yalnızca PDF kabul edilir");
      }
      if (file.size > MAX_PDF_SIZE) throw new Error("PDF en fazla 15 MB olabilir");

      const [text, fingerprint] = await Promise.all([extractPdfText(file), sha256(file)]);
      if (!text.trim()) {
        throw new Error("PDF metin içermiyor. Taranmış görüntü PDF'leri şu anda desteklenmiyor.");
      }
      const response = await fetch("/api/performance/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fingerprint, text }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "PDF analiz edilemedi");
      setPreview(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "PDF analiz edilemedi");
    } finally {
      setBusy(false);
    }
  }

  function ignore(index: number) {
    if (preview) setPreview({ ...preview, unknown: preview.unknown.filter((_, itemIndex) => itemIndex !== index) });
  }

  function acceptUnknown(index: number) {
    if (!preview) return;
    const unknown = preview.unknown[index];
    const category = prompt("İmalat adı", unknown.text);
    const quantity = prompt("Miktar");
    const unit = prompt("Birim: METRE veya ADET", "METRE");
    if (!category || !quantity || (unit !== "METRE" && unit !== "ADET")) return;
    const entry: ProductionEntryInput = {
      teamName: unknown.teamName ?? "Bilinmeyen Ekip",
      category: category.toLocaleUpperCase("tr-TR"),
      subtype: null,
      cableCapacity: null,
      cableFamily: null,
      quantity: Number(quantity),
      unit,
      originalText: unknown.text,
    };
    setPreview({
      ...preview,
      entries: [...preview.entries, entry],
      unknown: preview.unknown.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  async function commit() {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/performance/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(preview),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Kayıt yapılamadı");
      alert("PDF performans kayıtları kaydedildi");
      router.push("/performance/daily");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kayıt yapılamadı");
    } finally {
      setBusy(false);
    }
  }

  const grouped = new Map<string, ProductionEntryInput[]>();
  if (preview) {
    for (const entry of preview.entries) {
      grouped.set(entry.teamName, [...(grouped.get(entry.teamName) ?? []), entry]);
    }
  }

  return <>
    <form className="card" onSubmit={analyze}>
      <div className="filters">
        <input type="file" name="file" accept="application/pdf,.pdf" required />
        <button disabled={busy}>{busy ? "Analiz ediliyor…" : "PDF Analiz Et"}</button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
    {preview && <div className="section">
      <div className="grid">
        {[["Dosya", preview.fileName], ["Ekip", preview.teams.length], ["Tanınan İmalat", preview.entries.length], ["Tanınmayan", preview.unknown.length], ["Toplam Kayıt", preview.entries.length]].map(([label, value]) =>
          <div className="card kpi" key={label}><span className="muted">{label}</span><strong>{value}</strong></div>,
        )}
      </div>
      <div className="card section">
        <label>Çalışma Tarihi <input type="date" value={preview.workDate} onChange={(event) => setPreview({ ...preview, workDate: event.target.value })} /></label>
        {preview.duplicate && <p className="error"><b>Bu PDF daha önce yüklenmiş.</b></p>}
      </div>
      {[...grouped].map(([team, entries]) => <div className="card section" key={team}>
        <h2>{team}</h2>
        {entries.map((entry, index) => <p key={index}>{entry.subtype ? `${entry.category} ${entry.subtype}` : entry.category} — <b>{entry.quantity} {entry.unit}</b></p>)}
      </div>)}
      {preview.unknown.length > 0 && <div className="card section">
        <h2>Tanınmayan Satırlar</h2>
        {preview.unknown.map((unknown, index) => <div className="filters" key={`${unknown.text}-${index}`}>
          <span>{unknown.text} <small className="muted">— {unknown.reason}</small></span>
          <button type="button" className="secondary" onClick={() => ignore(index)}>Yok Say</button>
          <button type="button" onClick={() => acceptUnknown(index)}>Düzenle ve Kabul Et</button>
        </div>)}
      </div>}
      <p><button disabled={busy || preview.duplicate || !preview.workDate || !preview.entries.length} onClick={commit}>Onayla ve Kaydet</button></p>
    </div>}
  </>;
}
