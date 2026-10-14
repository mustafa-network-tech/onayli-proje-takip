import DailyReportWorkspace from "@/components/DailyReportWorkspace";
import { getDraft, listHistory } from "@/lib/daily-report";

export const dynamic = "force-dynamic";
export const metadata = { title: "Günlük Bina Raporları" };

export default async function DailyReports() {
  const [draft, history] = await Promise.all([getDraft(), listHistory()]);
  return <div className="daily-reports">
    <div className="top"><div><h1>Günlük Bina Raporları</h1><p className="muted">Binaları taslağa kaydedin; “Günlük Rapor Al” ile o günün raporu olarak kesinleştirin.</p></div></div>
    <DailyReportWorkspace draftItems={draft?.items ?? []} history={history} />
  </div>;
}
