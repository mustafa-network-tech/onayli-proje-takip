"use client";
import { useState } from "react";
import Link from "next/link";
import { CorporateNoteForm, CorporateProgress } from "./CorporateActions";
import CorporateCreateForm from "./CorporateCreateForm";
import { corporateStatus, filterCorporateProjects, type CorporateProjectRow, type CorporateStatus } from "@/lib/corporate-shared";

type Filters = { district?: string; q?: string; status: CorporateStatus };
const states = [["all", "Tüm Projeler"], ["not_started", "Başlanmadı"], ["ongoing", "Devam Ediyor"], ["completed", "Tamamlandı"]] as const;

export default function CorporateTable({ projects, initialFilters }: { projects: CorporateProjectRow[]; initialFilters: Filters }) {
  const [filters, setFilters] = useState(initialFilters);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [selectionOnly, setSelectionOnly] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false), [notice, setNotice] = useState("");
  const selectedRows = projects.filter(row => selected.has(row.id));
  const matching = filterCorporateProjects(projects, { ...filters, status: "all" });
  const rows = selectionOnly ? selectedRows : matching.filter(row => filters.status === "all" || corporateStatus(row).key === filters.status);
  const districts = [...new Set(projects.map(row => row.district).filter((district): district is string => !!district))].sort((a,b) => a.localeCompare(b,"tr"));
  const query = new URLSearchParams({ status: filters.status, ...(filters.district ? { district: filters.district } : {}), ...(filters.q ? { q: filters.q } : {}) }).toString();
  function toggle(id: string) { setSelected(previous => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next; }); }
  function selectVisible(value: boolean) { setSelected(previous => { const next = new Set(previous); rows.forEach(row => value ? next.add(row.id) : next.delete(row.id)); return next; }); }
  async function downloadSelected() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/corporate/export", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: selectedRows.map(row => row.id) }) });
      if (!response.ok) throw new Error((await response.json()).error ?? "Çıktı alınamadı.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = "TTVPN-Projeleri-Secilenler.xlsx";
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Çıktı alınamadı."); }
    finally { setBusy(false); }
  }
  return <div className="corporate-module">
    <div className="top"><div><h1>Kurumsal Projeler</h1><p className="muted">TTVPN Projeleri · Kablo ve Ek yapıldığında tamamlanır</p></div><div className="filters"><button type="button" onClick={() => { setShowCreate(true); setNotice(""); }}>Manuel Proje Ekle</button><Link className="button" href="/corporate/import">Kurumsal Excel Yükle</Link></div></div>
    {showCreate && <CorporateCreateForm onCancel={() => setShowCreate(false)} onCreated={projectId => {
      setShowCreate(false); setSelectionOnly(false); setFilters({ status: "all", q: projectId }); setNotice(`${projectId} ID'li proje eklendi.`);
    }} />}
    {notice && <p role="status">{notice}</p>}
    <div className="grid">{states.map(([state,label]) => <div className="card kpi" key={state}><span>{label}</span><strong>{(state === "all" ? matching.length : matching.filter(row => corporateStatus(row).key === state).length).toLocaleString("tr-TR")}</strong></div>)}</div>
    <form key={JSON.stringify(filters)} className="filters section" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); setFilters({district:String(data.get("district") ?? ""),q:String(data.get("q") ?? ""),status:String(data.get("status")) as CorporateStatus}); setSelectionOnly(false); }}>
      <select aria-label="İlçe" name="district" defaultValue={filters.district ?? ""}><option value="">Tüm İlçeler</option>{districts.map(district => <option key={district}>{district}</option>)}</select>
      <input aria-label="ID veya adres ara" name="q" placeholder="ID veya adres ara" maxLength={200} defaultValue={filters.q} />
      <select aria-label="Durum" name="status" defaultValue={filters.status}>{states.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
      <button>Filtrele</button>
      {!selectionOnly && <a className="button" href={`/api/corporate/export?${query}`}>Filtrelenenleri Excel Al</a>}
      <a className="button" href="/api/corporate/export?status=all">Komple Excel Al</a>
    </form>
    <div className="card filters corporate-selection"><b>{selectedRows.length} proje seçili</b>
      <button type="button" className="secondary" disabled={!selectedRows.length && !selectionOnly} onClick={() => setSelectionOnly(!selectionOnly)}>{selectionOnly ? "Filtrelenen Listeye Dön" : "Seçilenleri Listele"}</button>
      <button type="button" disabled={busy || !selectedRows.length} onClick={downloadSelected}>{busy ? "Hazırlanıyor…" : "Seçilenleri Excel Al"}</button>
      <button type="button" className="secondary" disabled={!selectedRows.length} onClick={() => { setSelected(new Set()); setSelectionOnly(false); }}>Seçimi Temizle</button>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <p className="muted">{selectionOnly ? "Seçilen projeler (tüm durumlardan)" : "Filtrelenen projeler"}: {rows.length}. Filtre değiştirirken seçimler korunur. Tamamlanan satırlar Excel çıktısında yeşildir.</p>
    <div className="table-wrap"><table><thead><tr><th><input aria-label="Görünen projelerin tümünü seç" type="checkbox" checked={rows.length > 0 && rows.every(row => selected.has(row.id))} disabled={!rows.length} onChange={event => selectVisible(event.target.checked)} /></th><th>İlçe</th><th>Adres</th><th>ID</th><th>Kablo</th><th>Ek</th><th>Durum</th><th>Not</th><th>Not İşlemi</th></tr></thead><tbody>
      {rows.map(row => { const status = corporateStatus(row); return <tr key={row.id}><td><input aria-label={`${row.projectId} projesini seç`} type="checkbox" checked={selected.has(row.id)} onChange={() => toggle(row.id)} /></td><td>{row.district ?? "—"}</td><td className="corporate-address">{row.address ?? "—"}</td><td>{row.projectId}</td><td><CorporateProgress id={row.id} field="cable" done={row.cableCompleted} /></td><td><CorporateProgress id={row.id} field="splice" done={row.spliceCompleted} /></td><td><span className={`badge ${status.key === "completed" ? "ok" : status.key === "ongoing" ? "warn" : ""}`}>{status.label}</span></td><td className="corporate-note">{row.note || "—"}</td><td><CorporateNoteForm id={row.id} note={row.note} /></td></tr>; })}
      {!rows.length && <tr><td colSpan={9}>Bu seçim için Kurumsal proje bulunmuyor.</td></tr>}
    </tbody></table></div>
  </div>;
}
