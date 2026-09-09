"use client";
import { useMemo, useRef, useState } from "react";
import TaficsForm from "./TaficsForm";
import { downloadExcelFile, fetchExcelFile } from "@/lib/excel-sharing";
import { completionStatuses, emptyTaficsFilters, filterTaficsProjects, permissionStatuses, taficsHeaders, taficsTotals, type TaficsFilters, type TaficsRow } from "@/lib/tafics-shared";

const number = (value: number) => value.toLocaleString("tr-TR", { maximumFractionDigits: 12 });
function Status({ value }: { value: string }) {
  return <span className={`badge ${value === "ALINDI" || value === "TAMAMLANDI" ? "ok" : value === "DEVAM EDİYOR" ? "warn" : ""}`}>{value}</span>;
}
export default function TaficsTable({ projects }: { projects: TaficsRow[] }) {
  const [records, setRecords] = useState(projects), [filters, setFilters] = useState(emptyTaficsFilters);
  const [editing, setEditing] = useState<TaficsRow | null | undefined>(undefined);
  const [page, setPage] = useState(1), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const formArea = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => filterTaficsProjects(records, filters), [records, filters]);
  const totals = useMemo(() => taficsTotals(rows), [rows]);
  const pageCount = Math.max(1, Math.ceil(rows.length / 50)), currentPage = Math.min(page, pageCount);
  const visible = rows.slice((currentPage - 1) * 50, currentPage * 50);
  const options = useMemo(() => ({
    province: [...new Set(records.map(row => row.province).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    projectType: [...new Set(records.map(row => row.projectType).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    permissionStatus: permissionStatuses, completionStatus: completionStatuses,
  }), [records]);
  function changeFilter(key: keyof TaficsFilters, value: string) { setFilters(previous => ({ ...previous, [key]: value })); setPage(1); }
  function edit(row: TaficsRow | null) {
    setEditing(row); setError(""); setNotice("");
    requestAnimationFrame(() => formArea.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  async function remove(row: TaficsRow) {
    if (busy || !confirm(`“${row.projectName}” (${row.province}) projesi kalıcı olarak silinecek. Onaylıyor musunuz?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/tafics/${encodeURIComponent(row.id)}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmed: true }) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error ?? "Proje silinemedi.");
      setRecords(previous => previous.filter(item => item.id !== row.id)); setNotice(`${row.projectName} silindi.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Proje silinemedi."); }
    finally { setBusy(false); }
  }
  async function download() {
    setBusy(true); setError("");
    try { downloadExcelFile(await fetchExcelFile(`/api/tafics/export?${new URLSearchParams(filters)}`)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Excel oluşturulamadı."); }
    finally { setBusy(false); }
  }
  return <div className="tafics-module">
    <div className="top"><div><h1>TAFICS Projeleri</h1><p className="muted">Proje, izin ve metraj takibi</p></div><div className="filters">
      <button type="button" disabled={busy || editing !== undefined} onClick={() => edit(null)}>Yeni TAFICS Projesi</button>
      <button type="button" className="excel-share-button" disabled={busy || editing !== undefined} onClick={download}>{busy ? "İşleniyor…" : "Excel İndir"}</button>
    </div></div>
    <div ref={formArea}>{editing !== undefined && <TaficsForm key={editing?.id ?? "new"} project={editing ?? undefined} onCancel={() => setEditing(undefined)} onSaved={row => {
      const creating = editing === null;
      setRecords(previous => creating ? [...previous, row] : previous.map(item => item.id === row.id ? row : item));
      setEditing(undefined); setFilters(emptyTaficsFilters); setPage(creating ? Math.ceil((records.length + 1) / 50) : currentPage);
      setNotice(`${row.projectName} ${creating ? "eklendi" : "güncellendi"}.`);
    }} />}</div>
    {notice && <p role="status">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}
    <div className="grid section">{([["underground", "Toplam Yeraltı"], ["cable", "Toplam Kablo"], ["horizontalDrilling", "Toplam Yatay Sondaj"]] as const).map(([field, label]) =>
      <div key={field} className="card kpi"><span>{label}</span><strong>{number(totals[field])}</strong></div>)}
    </div>
    <div className="filters section">
      <label>Proje Adı / İl Ara<input type="search" value={filters.q} maxLength={1000} placeholder="Proje adı veya il" onChange={event => changeFilter("q", event.target.value)} /></label>
      {([["province", "İl"], ["projectType", "Proje Türü"], ["permissionStatus", "İzin Durumu"], ["completionStatus", "Tamamlanma Durumu"]] as const).map(([field, label]) =>
        <label key={field}>{label}<select value={filters[field]} onChange={event => changeFilter(field, event.target.value)}><option value="">Tümü</option>{options[field].map(value => <option key={value}>{value}</option>)}</select></label>)}
      <button className="secondary" type="button" onClick={() => { setFilters(emptyTaficsFilters); setPage(1); }}>Filtreleri Temizle</button>
    </div>
    <p className="muted" role="status">{rows.length} proje · Toplamlar ve Excel tüm arama/filtre sonuçlarını kapsar.</p>
    <div className="table-wrap" tabIndex={0} role="region" aria-label="TAFICS proje tablosu, tüm sütunlar için yatay kaydırın">
      <table><thead><tr>{taficsHeaders.map(label => <th scope="col" key={label}>{label}</th>)}<th scope="col">İşlemler</th></tr></thead>
        <tbody>{visible.map((row, index) => <tr key={row.id}>
          <td>{(currentPage - 1) * 50 + index + 1}</td><td>{row.province}</td><td className="tafics-name">{row.projectName}</td><td>{row.projectType}</td>
          <td>{number(row.underground)}</td><td>{number(row.cable)}</td><td>{number(row.horizontalDrilling)}</td>
          <td><Status value={row.permissionStatus} /></td><td><Status value={row.completionStatus} /></td>
          <td className="tafics-description">{row.description ? <details><summary>Açıklamayı Gör</summary><div>{row.description}</div></details> : "—"}</td>
          <td><div className="filters"><button type="button" className="secondary" disabled={busy || editing !== undefined} aria-label={`${row.projectName} düzenle`} onClick={() => edit(row)}>Düzenle</button>
            <button type="button" className="tafics-delete" disabled={busy || editing !== undefined} aria-label={`${row.projectName} sil`} onClick={() => remove(row)}>Sil</button></div></td>
        </tr>)}{!visible.length && <tr><td colSpan={11}>{records.length ? "Arama ve filtrelere uygun proje bulunamadı." : "Henüz TAFICS projesi yok. Yeni TAFICS Projesi ile başlayın."}</td></tr>}</tbody>
      </table>
    </div>
    {pageCount > 1 && <nav className="filters section" aria-label="TAFICS sayfaları"><button className="secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Önceki</button><span>Sayfa {currentPage} / {pageCount}</span><button className="secondary" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Sonraki</button></nav>}
  </div>;
}
