"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DescriptionEditor({ value, endpoint, maxLength, disabled = false, onSaved }: {
  value: string; endpoint: string; maxLength: number; disabled?: boolean; onSaved?: (value: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ description: draft }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Açıklama kaydedilemedi.");
      onSaved?.(result.description); setEditing(false); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Açıklama kaydedilemedi."); }
    finally { setBusy(false); }
  }
  return <div style={{ minWidth: 230, maxWidth: 450, whiteSpace: "normal" }}>
    {editing ? <form onSubmit={save}>
      <label>Açıklama<textarea autoFocus rows={4} maxLength={maxLength} value={draft} disabled={busy || disabled} onChange={event => setDraft(event.target.value)} style={{ width: "100%" }} /></label>
      <div className="filters"><button disabled={busy || disabled}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
        <button type="button" className="secondary" disabled={busy} onClick={() => { setEditing(false); setError(""); }}>Vazgeç</button></div>
      {error && <p className="error" role="alert">{error}</p>}
    </form> : <>
      <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 160, overflow: "auto", marginBottom: 8 }}>{value || "—"}</div>
      <button type="button" className="secondary" disabled={disabled} onClick={() => { setDraft(value); setEditing(true); setError(""); }}>Açıklamayı Düzenle</button>
    </>}
  </div>;
}
