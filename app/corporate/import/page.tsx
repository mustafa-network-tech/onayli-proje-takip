import Link from "next/link";
import CorporateImportForm from "@/components/CorporateImportForm";
export default function CorporateImportPage() {
  return <><div className="top"><div><h1>Kurumsal Excel Yükle</h1><p className="muted">Kurumsal / TTVPN-ME projeleri</p></div><Link href="/corporate">Kurumsal Projelere Dön</Link></div><CorporateImportForm /></>;
}
