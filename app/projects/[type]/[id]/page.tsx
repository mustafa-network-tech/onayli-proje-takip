import {db} from "@/lib/db";
import {formatProgress,hpWeightedProgress,manufacturing} from "@/lib/stats";
import {notFound} from "next/navigation";
import {BuildingActions,NoteForm} from "@/components/BuildingActions";
import ProjectExportControls from "@/components/ProjectExportControls";
export const dynamic="force-dynamic";

export default async function Detail({params}:{params:Promise<{type:string,id:string}>}){
 const {type,id}=await params;if(type!=="GF"&&type!=="BF")notFound();
 const p=await db.hpProject.findFirst({where:{id,projectType:type},include:{buildings:{where:{isActive:true},include:{notes:{orderBy:{createdAt:"desc"},take:1}}}}});if(!p)notFound();
 const stages=p.buildings.map(b=>manufacturing(b,type));
 const completed=stages.filter(s=>s.percent===100).length;
 const ongoing=stages.filter(s=>s.percent>0&&s.percent<100).length;
 const notStarted=p.buildings.length-completed-ongoing;
 const totalHp=p.buildings.reduce((a,b)=>a+b.bbkHp,0);
 const completedHp=p.buildings.reduce((sum,b)=>sum+(manufacturing(b,type).percent===100?b.bbkHp:0),0);
 const hpDisplay=`${completedHp} / ${totalHp}`;
 const progress=hpWeightedProgress(p.buildings,type);
 return <>
  <div className="top">
   <div><h1>Proje {p.projectId}</h1><span className="badge">{type}</span> <span className="muted">{p.centralName} · {p.projectYear}</span></div>
  </div>
  <ProjectExportControls type={type} filters={{id:p.projectId}}/>
  <div className="grid">{[["Toplam Bina",p.buildings.length],["Toplam HP",hpDisplay],["Tamamlanan",completed],["Devam Eden",ongoing],["Başlanmayan",notStarted],["HP Bazlı İlerleme",`%${formatProgress(progress)}`]].map(([x,n])=><div className="card kpi" key={x}><span className="muted">{x}</span><strong>{n}</strong></div>)}</div>
  <section className="section"><h2>Binalar</h2><div className="table-wrap"><table>
   <thead><tr><th>Adres</th>{type==="GF"?<th>HP</th>:<><th>HP</th><th>PSTN</th><th>DSL</th></>}<th>İmalat</th><th>İlerleme</th><th>Rekor</th><th>Açıklama / Not</th></tr></thead>
   <tbody>{p.buildings.map(b=>{const s=manufacturing(b,type);return <tr key={b.id}><td><a href={`/buildings/${b.id}`}><b>{b.neighborhood??"—"}</b><br/><span className="muted">{b.street} {b.doorNumber}</span></a></td><td>{b.bbkHp}</td>{type==="BF"&&<><td>{b.pstn??"—"}</td><td>{b.dsl??"—"}</td></>}<td><BuildingActions id={b.id} type={type} initial={{cable:b.cableCompleted,splice:b.spliceCompleted,obk:b.obkCompleted}}/></td><td><span className={`badge ${s.percent===100?"ok":s.percent?"warn":""}`}>{s.status} %{s.percent}</span></td><td>{b.rekorDate?.toLocaleDateString("tr-TR")??"—"}</td><td style={{minWidth:260}}>{b.notes[0]?.note&&<div title={b.notes[0].note} style={{marginBottom:7}}>{b.notes[0].note.slice(0,70)}</div>}<NoteForm id={b.id}/></td></tr>})}</tbody>
   <tfoot><tr><th>GENEL TOPLAM — Bina: {p.buildings.length} · HP: {hpDisplay} · Tamamlanan: {completed} · Devam Eden: {ongoing}</th><th>{hpDisplay}</th>{type==="BF"&&<><th>{p.buildings.reduce((a,b)=>a+(b.pstn??0),0)}</th><th>{p.buildings.reduce((a,b)=>a+(b.dsl??0),0)}</th></>}<th colSpan={4}>HP Bazlı İlerleme: %{formatProgress(progress)}</th></tr></tfoot>
  </table></div></section>
 </>
}
