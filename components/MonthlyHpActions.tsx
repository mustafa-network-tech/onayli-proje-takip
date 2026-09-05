"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CompletionMonth({ id, month }: { id: string; month: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(month ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/monthly-hp/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ month: value }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Ay kaydedilemedi.");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Ay kaydedilemedi."); }
    finally { setBusy(false); }
  }
  return <div className="no-print">
    <div style={{ display: "flex", gap: 6 }}>
      <input aria-label="Tamamlanma ayı" type="month" min="2000-01" max="2099-12" value={value} onChange={event => setValue(event.target.value)} disabled={busy} />
      <button type="button" disabled={busy || !value || value === month} onClick={save}>{busy ? "Kaydediliyor…" : "Ayı Kaydet"}</button>
    </div>
    {error && <p role="alert" className="error">{error}</p>}
  </div>;
}

export function PrintHpReport() {
  return <button className="secondary no-print" type="button" onClick={() => window.print()}>Yazdır / PDF Kaydet</button>;
}
