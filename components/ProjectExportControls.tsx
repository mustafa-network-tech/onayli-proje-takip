"use client";
import {useState} from "react";

export default function ProjectExportControls({type,filters}:{type:"GF"|"BF";filters:Record<string,string|undefined>}){
 const [format,setFormat]=useState<"xlsx"|"pdf">("xlsx"),[scope,setScope]=useState<"building"|"project">("building");
 function download(){const query=new URLSearchParams({format});for(const [key,value] of Object.entries(filters))if(value)query.set(key,value);const path=scope==="building"?`/api/projects/${type}/export`:`/api/project-summary/${type}`;window.location.href=`${path}?${query}`}
 const row={display:"flex",alignItems:"center",gap:8} as const;
 return <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",margin:"0 0 14px",padding:"10px 12px",background:"#fff",border:"1px solid var(--line)",borderRadius:9}} aria-label="Dışa aktarma seçenekleri"><div style={row}><b>Dosya:</b><label style={row}><input type="radio" name={`format-${type}-${filters.id??"all"}`} checked={format==="xlsx"} onChange={()=>setFormat("xlsx")}/> Excel</label><label style={row}><input type="radio" name={`format-${type}-${filters.id??"all"}`} checked={format==="pdf"} onChange={()=>setFormat("pdf")}/> PDF</label></div><div style={row}><b>Liste:</b><label style={row}><input type="radio" name={`scope-${type}-${filters.id??"all"}`} checked={scope==="building"} onChange={()=>setScope("building")}/> Bina bazlı</label><label style={row}><input type="radio" name={`scope-${type}-${filters.id??"all"}`} checked={scope==="project"} onChange={()=>setScope("project")}/> Proje bazlı</label></div><button type="button" onClick={download}>İndir</button></div>
}
