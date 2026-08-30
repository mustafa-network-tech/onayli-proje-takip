import {db} from "@/lib/db";
import ImportDeleteButton from "@/components/ImportDeleteButton";
export const dynamic="force-dynamic";

export default async function Imports(){
 const imports=await db.hpExcelImport.findMany({include:{user:true},orderBy:{importedAt:"desc"}});
 const projectCounts=await Promise.all(imports.map(i=>db.hpProject.count({where:{lastImportId:i.id}})));
 return <><div className="top"><div><h1>Yüklenen Excel Dosyaları</h1><div className="muted">Test importlarını ve bunlara ait bütün verileri yönetin</div></div></div><div className="card"><p className="error"><b>Dikkat:</b> Silme işlemi geri alınamaz. İlgili projeler, binalar, notlar ve işlem geçmişi birlikte silinir.</p></div><div className="table-wrap section"><table><thead><tr><th>Dosya</th><th>Tür</th><th>Yükleme Tarihi</th><th>Kullanıcı</th><th>Satır</th><th>Bağlı Proje</th><th>Kaydedilen Bina</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>{imports.map((i,index)=><tr key={i.id}><td><b>{i.fileName}</b></td><td><span className={`badge ${i.projectType==="GF"?"ok":"warn"}`}>{i.projectType}</span></td><td>{i.importedAt.toLocaleString("tr-TR")}</td><td>{i.user.name}</td><td>{i.totalRows}</td><td>{projectCounts[index]}</td><td>{i.newBuildings}</td><td>{i.status}</td><td><ImportDeleteButton id={i.id} fileName={i.fileName}/></td></tr>)}</tbody></table></div>{!imports.length&&<div className="card section">Henüz yüklenmiş Excel dosyası bulunmuyor.</div>}</>
}
