"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { downloadExcelFile, fetchExcelFile } from "@/lib/excel-sharing";
import {
  DAILY_STATUSES, computeTotals, displayDate, formatHp, noteRequired, sections, statusFill, statusLabel,
  type DailyItem, type DailyReportHead, type DailyStatus,
} from "@/lib/daily-report-shared";

type Found = { id: string; projectType: "GF" | "BF"; projectId: string; neighborhood: string; address: string; hp: number; inDraft: boolean };
type Detail = { report: DailyReportHead; items: DailyItem[] };

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "İşlem tamamlanamadı.");
  return data as T;
}
const json = (method: string, body?: unknown): RequestInit => ({ method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

async function downloadReport(detail: Detail, format: "xlsx" | "pdf") {
  if (format === "xlsx") downloadExcelFile(await fetchExcelFile(`/api/daily-reports/${detail.report.id}/export`));
  else { const { downloadDailyReportPdf } = await import("@/lib/daily-report-pdf"); await downloadDailyReportPdf(detail.report, detail.items); }
}

export default function DailyReportWorkspace({ draftItems, history }: { draftItems: DailyItem[]; history: DailyReportHead[] }) {
  const router = useRouter();
  const [type, setType] = useState<"GF" | "BF">("GF");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<DailyStatus>("COMPLETED");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState<{ id: string; status: DailyStatus; note: string } | null>(null);
  const totals = computeTotals(draftItems);
  const say = (kind: "ok" | "error", text: string) => setMessage({ kind, text });

  async function run(task: () => Promise<void>) {
    setBusy(true); setMessage(null);
    try { await task(); } catch (reason) { say("error", reason instanceof Error ? reason.message : "İşlem tamamlanamadı."); }
    finally { setBusy(false); }
  }

  const search = () => run(async () => {
    const result = await call<{ buildings: Found[] }>(`/api/daily-reports/buildings?type=${type}&q=${encodeURIComponent(query)}`);
    setFound(result.buildings); setSelected(new Set());
    if (!result.buildings.length) say("error", "Bu Proje ID için bina bulunamadı.");
  });
  const toggle = (id: string) => setSelected(current => { const next = new Set(current); if (!next.delete(id)) next.add(id); return next; });
  const selectable = (found ?? []).filter(b => !b.inDraft);

  const save = () => run(async () => {
    const result = await call<{ added: number; skipped: number }>("/api/daily-reports/items", json("POST", { buildingIds: [...selected], status, note }));
    say("ok", `${result.added} bina taslağa kaydedildi${result.skipped ? `, ${result.skipped} bina zaten taslakta` : ""}.`);
    setNote(""); setSelected(new Set());
    setFound(current => current && current.map(b => selected.has(b.id) ? { ...b, inDraft: true } : b));
    router.refresh();
  });

  const saveEdit = () => editing && run(async () => {
    await call(`/api/daily-reports/items/${editing.id}`, json("PATCH", { status: editing.status, note: editing.note }));
    setEditing(null); router.refresh();
  });
  const remove = (id: string) => confirm("Bu bina taslaktan çıkarılsın mı?") && run(async () => {
    await call(`/api/daily-reports/items/${id}`, json("DELETE")); router.refresh();
  });

  // The report is saved first; a failed download never loses it (history can re-download).
  const finalize = (format: "xlsx" | "pdf" | null) => run(async () => {
    const detail = await call<Detail>("/api/daily-reports/finalize", json("POST"));
    setConfirming(false); setFound(null); setSelected(new Set());
    router.refresh();
    if (!format) { say("ok", `"${detail.report.title}" kaydedildi.`); return; }
    try { await downloadReport(detail, format); say("ok", `"${detail.report.title}" kaydedildi ve indirildi.`); }
    catch (reason) { say("error", `"${detail.report.title}" kaydedildi, ancak dosya indirilemedi (${reason instanceof Error ? reason.message : "hata"}). Geçmiş Raporlar bölümünden tekrar indirebilirsiniz.`); }
  });

  const download = (id: string, format: "xlsx" | "pdf") => run(async () => {
    const detail = await call<Detail>(`/api/daily-reports/${id}`);
    await downloadReport(detail, format);
  });

  const cell = { whiteSpace: "normal", verticalAlign: "top" } as const;
  return <div className="daily-reports">
    {message && <p role="alert" className={message.kind === "error" ? "error" : "badge ok"} style={{ whiteSpace: "normal" }}>{message.text}</p>}

    <section className="card section">
      <h2 style={{ marginTop: 0 }}>Bina Ekle</h2>
      <div className="filters">
        <label>Tür <select value={type} onChange={event => { setType(event.target.value as "GF" | "BF"); setFound(null); }}><option>GF</option><option>BF</option></select></label>
        <label>Proje ID <input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => event.key === "Enter" && query.trim() && search()} placeholder="Birden fazla ID için boşluk/virgül" size={30} /></label>
        <button type="button" disabled={busy || !query.trim()} onClick={search}>Binaları Getir</button>
      </div>
      {found && found.length > 0 && <>
        <div className="table-wrap"><table>
          <thead><tr><th><input type="checkbox" aria-label="Tümünü seç" checked={!!selectable.length && selected.size === selectable.length} onChange={event => setSelected(event.target.checked ? new Set(selectable.map(b => b.id)) : new Set())} /></th><th>Proje ID</th><th>Mahalle</th><th>Bina Adresi</th><th>HP</th><th></th></tr></thead>
          <tbody>{found.map(b => <tr key={b.id}>
            <td><input type="checkbox" aria-label="Seç" disabled={b.inDraft} checked={selected.has(b.id)} onChange={() => toggle(b.id)} /></td>
            <td>{b.projectId}</td><td style={cell}>{b.neighborhood || "—"}</td><td style={{ ...cell, minWidth: 240 }}>{b.address}</td><td>{formatHp(b.hp)}</td>
            <td>{b.inDraft && <span className="badge">Taslakta</span>}</td></tr>)}</tbody>
        </table></div>
        <div className="filters" style={{ marginTop: 12, alignItems: "flex-start" }}>
          <label>Durum <select value={status} onChange={event => setStatus(event.target.value as DailyStatus)}>{DAILY_STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}</select></label>
          <label style={{ flex: "1 1 320px" }}>Açıklama{noteRequired(status) ? " (zorunlu)" : ""}
            <textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000} rows={2} style={{ width: "100%" }} /></label>
          <button type="button" disabled={busy || !selected.size || (noteRequired(status) && !note.trim())} onClick={save}>Kaydet ({selected.size} bina)</button>
        </div>
      </>}
    </section>

    <section className="section">
      <div className="top" style={{ marginBottom: 12 }}>
        <div><h2 style={{ margin: 0 }}>Taslak Rapor</h2>
          <div className="muted">{totals.totalBuildings} bina · Toplam HP (tamamlanan) <b>{formatHp(totals.completedHp)}</b> · Bekleyen sorunlu HP <b>{formatHp(totals.problemHp)}</b> · İptal HP <b>{formatHp(totals.cancelledHp)}</b></div></div>
        <button type="button" disabled={busy || !draftItems.length} onClick={() => setConfirming(true)}>Günlük Rapor Al</button>
      </div>
      {!draftItems.length && <div className="card muted">Taslakta bina yok. Yukarıdan bina ekleyin.</div>}
      {sections(draftItems).filter(s => s.items.length).map(section => <div key={section.status} className="section">
        <h3>{section.title} ({section.items.length})</h3>
        <div className="table-wrap"><table>
          <thead><tr><th>Proje ID</th><th>Mahalle</th><th>Bina Adresi</th><th>HP</th><th>Durum</th><th>Açıklama</th><th></th></tr></thead>
          <tbody>{section.items.map(item => <tr key={item.id} style={{ background: `#${statusFill[item.status]}` }}>
            <td>{item.projectId}</td><td style={cell}>{item.neighborhood || "—"}</td><td style={{ ...cell, minWidth: 220 }}>{item.address}</td><td>{formatHp(item.hp)}</td>
            {editing?.id === item.id ? <>
              <td><select value={editing.status} onChange={event => setEditing({ ...editing, status: event.target.value as DailyStatus })}>{DAILY_STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}</select></td>
              <td><textarea value={editing.note} maxLength={1000} rows={2} onChange={event => setEditing({ ...editing, note: event.target.value })} /></td>
              <td><button type="button" disabled={busy || (noteRequired(editing.status) && !editing.note.trim())} onClick={saveEdit}>Kaydet</button> <button type="button" className="secondary" onClick={() => setEditing(null)}>Vazgeç</button></td>
            </> : <>
              <td>{statusLabel[item.status]}</td><td style={{ ...cell, minWidth: 220 }}>{item.note}</td>
              <td><button type="button" className="secondary" disabled={busy} onClick={() => setEditing({ id: item.id, status: item.status, note: item.note })}>Düzenle</button> <button type="button" className="secondary" disabled={busy} onClick={() => remove(item.id)}>Çıkar</button></td>
            </>}
          </tr>)}</tbody>
        </table></div>
      </div>)}
    </section>

    <section className="section">
      <h2>Geçmiş Raporlar</h2>
      <div className="table-wrap"><table>
        <thead><tr><th>Rapor</th><th>Tarih</th><th>Bina</th><th>Toplam HP</th><th>Bekleyen Sorunlu HP</th><th>İptal HP</th><th>İndir</th></tr></thead>
        <tbody>{history.map(report => <tr key={report.id}>
          <td>{report.title}</td><td>{displayDate(report.reportDate ?? "")}</td>
          <td>{report.totalBuildings} ({report.completedBuildings} / {report.problemBuildings} / {report.cancelledBuildings})</td>
          <td><b>{formatHp(report.completedHp ?? 0)}</b></td><td>{formatHp(report.problemHp ?? 0)}</td><td>{formatHp(report.cancelledHp ?? 0)}</td>
          <td><button type="button" disabled={busy} onClick={() => download(report.id, "xlsx")}>Excel</button> <button type="button" className="secondary" disabled={busy} onClick={() => download(report.id, "pdf")}>PDF</button></td>
        </tr>)}
        {!history.length && <tr><td colSpan={7}>Henüz kesinleşmiş rapor yok.</td></tr>}</tbody>
      </table></div>
      <p className="muted">Kesinleşmiş raporlar değiştirilemez; dosyalar rapor alındığı andaki kayıttan üretilir. Parantez: tamamlanan / problemli / iptal.</p>
    </section>

    {confirming && <div role="dialog" aria-modal="true" aria-label="Günlük rapor al" style={{ position: "fixed", inset: 0, background: "#102d4380", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
      <div className="card" style={{ maxWidth: 460, width: "100%" }}>
        <h2 style={{ marginTop: 0 }}>Günlük raporu al</h2>
        <p>Taslak, bugünün tarihiyle kesinleşecek ve <b>değiştirilemeyecek</b>. Sonraki girişler yeni bir taslağa kaydedilir.</p>
        <ul>
          <li>Toplam bina: <b>{totals.totalBuildings}</b> (tamamlanan {totals.completedBuildings}, problemli {totals.problemBuildings}, iptal {totals.cancelledBuildings})</li>
          <li>Toplam HP (tamamlanan): <b>{formatHp(totals.completedHp)}</b></li>
          <li>Bekleyen sorunlu HP: <b>{formatHp(totals.problemHp)}</b></li>
          <li>İptal HP: <b>{formatHp(totals.cancelledHp)}</b></li>
        </ul>
        <div className="filters">
          <button type="button" disabled={busy} onClick={() => finalize("xlsx")}>Kaydet ve Excel indir</button>
          <button type="button" disabled={busy} onClick={() => finalize("pdf")}>Kaydet ve PDF indir</button>
          <button type="button" className="secondary" disabled={busy} onClick={() => finalize(null)}>Yalnızca kaydet</button>
          <button type="button" className="secondary" disabled={busy} onClick={() => setConfirming(false)}>Vazgeç</button>
        </div>
      </div>
    </div>}
  </div>;
}
