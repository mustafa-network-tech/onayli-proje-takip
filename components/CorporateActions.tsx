"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

async function update(id: string, input: object) {
  const response = await fetch(`/api/corporate/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Kayıt güncellenemedi.");
}
export function CorporateProgress({ id, field, done }: { id: string; field: "cable" | "splice"; done: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function toggle() {
    setBusy(true); setError("");
    try { await update(id, { field, value: !done }); router.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "İşlem başarısız."); }
    finally { setBusy(false); }
  }
  return <><button type="button" className={done ? "corporate-done" : "secondary"} disabled={busy} aria-pressed={done} aria-label={`${field === "cable" ? "Kablo" : "Ek"}: ${done ? "Yapıldı" : "Yapılmadı"}`} onClick={toggle}>{busy ? "Kaydediliyor…" : done ? "✓ Yapıldı" : "○ Yapılmadı"}</button>{error && <p className="error" role="alert">{error}</p>}</>;
}
export function CorporateEdit({ id, district, address, note }: { id: string; district: string | null; address: string | null; note: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try { await update(id, { district: data.get("district"), address: data.get("address"), note: data.get("note") }); router.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Kaydedilemedi."); }
    finally { setBusy(false); }
  }
  return <details className="corporate-edit"><summary>İlçe / Adres / Not Düzenle</summary><form onSubmit={save}>
    <label>İlçe<input name="district" defaultValue={district ?? ""} maxLength={200} /></label>
    <label>Adres<textarea name="address" defaultValue={address ?? ""} maxLength={2000} rows={3} /></label>
    <label>Not<textarea name="note" defaultValue={note} maxLength={2000} rows={3} /></label>
    <button disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
    {error && <p className="error" role="alert">{error}</p>}
  </form></details>;
}
