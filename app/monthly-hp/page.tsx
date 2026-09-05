import Link from "next/link";
import ExcelShareButton from "@/components/ExcelShareButton";
import { CompletionMonth, PrintHpReport } from "@/components/MonthlyHpActions";
import { getMonthlyHpReport, reportFilters } from "@/lib/monthly-hp";
import { buildingAddress, hpTotals, monthLabel, type HpScope } from "@/lib/monthly-hp-shared";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aylık HP Takibi" };
const number = (value: number) => value.toLocaleString("tr-TR");

export default async function MonthlyHp({ searchParams }: { searchParams: Promise<{ month?: string; type?: string; list?: string }> }) {
  let filters;
  try { filters = reportFilters(await searchParams); }
  catch (error) { return <div className="card"><h1>Aylık HP Takibi</h1><p className="error">{error instanceof Error ? error.message : "Geçersiz filtre"}</p><Link href="/monthly-hp">Filtreleri sıfırla</Link></div>; }
  const { month, scope, list } = filters;
  const report = await getMonthlyHpReport(filters);
  const monthly = report.history.filter(item => item.month === month);
  const scopes: HpScope[] = ["GF", "BF", "ALL"];
  const scopeLabel = (value: HpScope) => value === "ALL" ? "GF + BF" : value;
  const sum = (items: typeof monthly, type: HpScope, field: "buildings" | "hp") => items.filter(item => type === "ALL" || item.projectType === type).reduce((total, item) => total + item[field], 0);
  const totals = hpTotals(report.rows);
  const query = new URLSearchParams({ month, type: scope, list }).toString();
  const months = [...new Set([month, ...report.history.map(item => item.month).filter((value): value is string => !!value)])].sort().reverse();
  const title = list === "remaining" ? "Güncel Kalan Binalar" : `${monthLabel(month)} — Tamamlanan Binalar`;
  return <div className="monthly-hp">
    <div className="top no-print"><div><h1>Aylık HP Takibi</h1><p className="muted">Tamamlanan binaların aylık HP kayıtları ve güncel kalan işler</p></div></div>
    <form className="filters no-print">
      <label>Ay <input type="month" name="month" defaultValue={month} min="2000-01" max="2099-12" required /></label>
      <label>Proje türü <select name="type" defaultValue={scope}><option value="ALL">GF + BF</option><option value="GF">GF</option><option value="BF">BF</option></select></label>
      <label>Liste <select name="list" defaultValue={list}><option value="completed">Tamamlanan binalar</option><option value="remaining">Güncel kalan binalar</option></select></label>
      <button>Göster</button>
    </form>
    <div className="grid no-print">
      {scopes.map(type => <div className="card" key={type}>
        <h2 style={{ marginTop: 0 }}>{scopeLabel(type)}</h2>
        <div className="kpi"><span className="muted">{monthLabel(month)} tamamlanan HP</span><strong>{number(sum(monthly, type, "hp"))}</strong><span>{number(sum(monthly, type, "buildings"))} bina</span></div>
        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />
        <div className="kpi"><span className="muted">Güncel kalan HP</span><strong>{number(sum(report.remaining, type, "hp"))}</strong><span>{number(sum(report.remaining, type, "buildings"))} bina</span></div>
      </div>)}
    </div>
    <p className="muted no-print section">Excel’den tamamlanmış gelenler bir önceki aya, panelde gerekli imalatları bitenler işlem ayına kaydedilir. Aynı bina yeniden yüklenirse ikinci kez sayılmaz. Aylık kayıtlar Excel değişse veya silinse de korunur. İmalatı geri açılan bina güncel kalan işlere döner; geçmiş aylık kaydı korunur.</p>
    <section className="section hp-report">
      <h2>{title} · {scopeLabel(scope)}</h2>
      <p>{number(totals.ALL.buildings)} bina · <b>{number(totals.ALL.hp)} HP</b>{list === "remaining" && " · Ay seçiminden bağımsız güncel durum"}</p>
      <div className="filters no-print"><a className="button" href={`/api/monthly-hp/export?${query}`}>Excel Çıktısı Al</a><ExcelShareButton url={`/api/monthly-hp/export?${query}`} /><PrintHpReport /></div>
      <div className="table-wrap"><table className="hp-report-table">
        <thead><tr><th>Tür</th><th>Proje ID</th><th>UAVT</th><th>Bina Adresi</th><th>HP Sayısı</th>{list === "completed" && <><th>Ay</th><th className="no-print">Ayı Düzenle</th></>}</tr></thead>
        <tbody>{report.rows.map(row => <tr key={row.id}><td>{row.projectType}</td><td>{row.projectId}</td><td>{row.uavt ?? "—"}</td><td className="hp-address">{buildingAddress(row)}</td><td>{number(row.hp)}</td>{list === "completed" && <><td>{row.month ? monthLabel(row.month) : "—"}</td><td className="no-print"><CompletionMonth id={row.id} month={row.month} /></td></>}</tr>)}
        {!report.rows.length && <tr><td colSpan={list === "completed" ? 7 : 5}>Bu seçim için bina bulunmuyor.</td></tr>}</tbody>
        <tfoot><tr><th colSpan={4}>TOPLAM · {number(totals.ALL.buildings)} bina</th><th>{number(totals.ALL.hp)}</th>{list === "completed" && <><th></th><th className="no-print"></th></>}</tr></tfoot>
      </table></div>
    </section>
    <section className="section no-print"><h2>Aylık Tamamlanan HP Arşivi</h2><div className="table-wrap"><table>
      <thead><tr><th>Ay</th><th>GF Bina / HP</th><th>BF Bina / HP</th><th>Toplam Bina / HP</th></tr></thead>
      <tbody>{months.map(value => { const items = report.history.filter(item => item.month === value); return <tr key={value}><td><Link href={`/monthly-hp?month=${value}&type=${scope}&list=completed`}>{monthLabel(value)}</Link></td>{scopes.map(type => <td key={type}>{number(sum(items, type, "buildings"))} bina / <b>{number(sum(items, type, "hp"))} HP</b></td>)}</tr>; })}</tbody>
    </table></div></section>
  </div>;
}
