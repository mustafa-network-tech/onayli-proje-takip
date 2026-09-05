"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CorporateCreateForm({ onCreated, onCancel }: { onCreated: (projectId: string) => void; onCancel: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/corporate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        projectId: form.get("projectId"), district: form.get("district"), address: form.get("address"), note: form.get("note"),
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Proje eklenemedi.");
      onCreated(result.projectId);
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Proje eklenemedi. Lütfen tekrar deneyin."); }
    finally { setBusy(false); }
  }
  return <form className="card section" onSubmit={submit}>
    <h2 style={{ marginTop: 0 }}>Manuel Kurumsal Proje Ekle</h2>
    <p className="muted">Proje “Başlanmadı” durumunda açılır. Kablo ve Ek işlemlerini listeden işaretleyebilirsiniz.</p>
    <fieldset disabled={busy} style={{ border: 0, margin: 0, padding: 0 }}>
      <div className="grid">
        <label style={{ display: "grid", gap: 6 }}>İlçe<input name="district" required maxLength={200} /></label>
        <label style={{ display: "grid", gap: 6 }}>ID<input name="projectId" required maxLength={100} /></label>
      </div>
      <label style={{ display: "grid", gap: 6, marginTop: 12 }}>Adres<textarea name="address" required maxLength={2000} rows={3} /></label>
      <label style={{ display: "grid", gap: 6, marginTop: 12 }}>Not (isteğe bağlı)<textarea name="note" maxLength={2000} rows={2} /></label>
      <div className="filters" style={{ marginTop: 14, marginBottom: 0 }}><button>{busy ? "Kaydediliyor…" : "Projeyi Ekle"}</button><button type="button" className="secondary" onClick={onCancel}>Vazgeç</button></div>
    </fieldset>
    {error && <p className="error" role="alert">{error}</p>}
  </form>;
}
