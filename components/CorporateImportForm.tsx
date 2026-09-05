"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CorporatePreview } from "@/lib/corporate-shared";

export default function CorporateImportForm() {
  const router = useRouter();
  const [preview, setPreview] = useState<CorporatePreview | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function inspect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setPreview(null);
    try {
      const response = await fetch("/api/corporate/import/preview", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Excel okunamadı.");
      setPreview(result);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Excel okunamadı."); }
    finally { setBusy(false); }
  }
  async function commit() {
    if (!preview) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/corporate/import/commit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileName: preview.fileName, rows: preview.rows }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Excel kaydedilemedi.");
      router.push("/corporate"); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Excel kaydedilemedi."); }
    finally { setBusy(false); }
  }
  return <>
    <form className="card" onSubmit={inspect}><div className="filters"><input aria-label="Kurumsal Excel dosyası" type="file" name="file" accept=".xlsx" required disabled={busy} onChange={() => setPreview(null)} /><button disabled={busy}>{busy ? "İşleniyor…" : "Ön İzleme Oluştur"}</button></div>
      <p className="muted">SANTRAL_ADI → İlçe · CIZIM_ADI → Adres · CIZIM_ID → ID</p>
      <p>Yeni kayıtlar “Başlanmadı” olarak açılır. Aynı ID yeniden yüklenirse Kablo, Ek, notlar ve elle girilmiş ilçe/adres korunur.</p>
    </form>
    {error && <p className="error" role="alert">{error}</p>}
    {preview && <section className="section"><div className="grid">{[["Okunan Satır", preview.totalRows], ["Yeni Kayıt", preview.newProjects], ["Güncellenecek Kayıt", preview.existingProjects], ["Hatalı Satır", preview.errors.length]].map(([label, value]) => <div className="card kpi" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      {preview.errors.length > 0 && <div className="card section">{preview.errors.map((item, index) => <p className="error" key={index}>Satır {item.row}: {item.message}</p>)}</div>}
      <div className="table-wrap section"><table><thead><tr><th>İlçe</th><th>Adres</th><th>ID</th></tr></thead><tbody>{preview.rows.map(row => <tr key={row.projectId}><td>{row.district ?? "—"}</td><td className="corporate-address">{row.address ?? "—"}</td><td>{row.projectId}</td></tr>)}</tbody></table></div>
      <p><button type="button" disabled={busy || !preview.rows.length} onClick={commit}>Onayla ve Kaydet ({preview.rows.length} kayıt)</button></p>
    </section>}
  </>;
}
