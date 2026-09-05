import Link from "next/link";
import { corporateFilterSchema, findCorporateProjects } from "@/lib/corporate";
import CorporateTable from "@/components/CorporateTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kurumsal Projeler" };
export default async function CorporatePage({ searchParams }: { searchParams: Promise<{ district?: string | string[]; q?: string; status?: string }> }) {
  const result = corporateFilterSchema.safeParse(await searchParams);
  if (!result.success) return <div className="card"><h1>Kurumsal Projeler</h1><p className="error">Geçersiz filtre.</p><Link href="/corporate">Filtreleri sıfırla</Link></div>;
  const projects = await findCorporateProjects({ status: "all" });
  return <CorporateTable projects={projects} initialFilters={result.data} />;
}
