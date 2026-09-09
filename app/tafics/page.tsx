import TaficsTable from "@/components/TaficsTable";
import "./tafics.css";
import { findTaficsProjects } from "@/lib/tafics";

export const dynamic = "force-dynamic";
export const metadata = { title: "TAFICS Projeleri" };
export default async function TaficsPage() {
  try { return <TaficsTable projects={await findTaficsProjects()} />; }
  catch { return <div className="card"><h1>TAFICS Projeleri</h1><p className="error" role="alert">Projeler yüklenemedi. Lütfen daha sonra tekrar deneyin.</p><a className="button" href="/tafics">Yeniden Dene</a></div>; }
}
