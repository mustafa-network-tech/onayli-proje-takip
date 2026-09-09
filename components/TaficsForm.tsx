"use client";
import { useState } from "react";
import { completionStatuses, permissionStatuses, taficsSchema, type TaficsRow } from "@/lib/tafics-shared";

export default function TaficsForm({ project, onSaved, onCancel }: { project?: TaficsRow; onSaved: (row: TaficsRow) => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const input = taficsSchema.safeParse({ province: form.get("province"), projectName: form.get("projectName"), projectType: form.get("projectType"),
      underground: Number(form.get("underground")), cable: Number(form.get("cable")), horizontalDrilling: Number(form.get("horizontalDrilling")),
      permissionStatus: form.get("permissionStatus"), completionStatus: form.get("completionStatus"), description: form.get("description") });
    if (!input.success) { setError(input.error.issues[0].message); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(project ? `/api/tafics/${encodeURIComponent(project.id)}` : "/api/tafics", {
        method: project ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.project) throw new Error(result?.error ?? "Proje kaydedilemedi. Lütfen tekrar deneyin.");
      onSaved(result.project);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Proje kaydedilemedi."); }
    finally { setBusy(false); }
  }
  return <form className="card section tafics-form" onSubmit={submit} aria-label={project ? "TAFICS Projesini Düzenle" : "Yeni TAFICS Projesi"}>
    <h2>{project ? `${project.projectName} — Düzenle` : "Yeni TAFICS Projesi"}</h2>
    <fieldset disabled={busy}>
      <div className="grid">
        <label>İl<input name="province" required maxLength={200} defaultValue={project?.province} autoFocus /></label>
        <label>Proje Adı<input name="projectName" required maxLength={1000} defaultValue={project?.projectName} /></label>
        <label>Proje Türü<input name="projectType" maxLength={200} defaultValue={project?.projectType ?? "TAFICS"} /></label>
      </div>
      <div className="grid section">{([["underground", "Yeraltı"], ["cable", "Kablo"], ["horizontalDrilling", "Yatay Sondaj"]] as const).map(([field, label]) =>
        <label key={field}>{label}<input type="number" inputMode="decimal" name={field} required min={0} max={1e12} step="any" defaultValue={project?.[field] ?? 0} /></label>)}
      </div>
      <div className="grid section">
        <label>İzin Durumu<select name="permissionStatus" defaultValue={project?.permissionStatus ?? "ALINMADI"}>{permissionStatuses.map(status => <option key={status}>{status}</option>)}</select></label>
        <label>Tamamlanma Durumu<select name="completionStatus" defaultValue={project?.completionStatus ?? "BAŞLAMADI"}>{completionStatuses.map(status => <option key={status}>{status}</option>)}</select></label>
      </div>
      <label className="section">Açıklama (isteğe bağlı)<textarea name="description" rows={5} maxLength={30000} defaultValue={project?.description ?? ""} /></label>
      <div className="filters section"><button>{busy ? "Kaydediliyor…" : "Kaydet"}</button><button type="button" className="secondary" onClick={onCancel}>Vazgeç</button></div>
    </fieldset>
    {error && <p className="error" role="alert">{error}</p>}
  </form>;
}
