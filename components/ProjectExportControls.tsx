"use client";

import { useState } from "react";
import ExcelShareButton from "./ExcelShareButton";

export default function ProjectExportControls({type,filters}:{type:"GF"|"BF";filters:Record<string,string|undefined>}) {
  const [scope,setScope]=useState<"building"|"project">("building");
  const [format,setFormat]=useState<"xlsx"|"pdf">("xlsx");
  function exportUrl(exportFormat: "xlsx" | "pdf"){
    const query=new URLSearchParams();
    for(const [key,value] of Object.entries(filters)) if(value) query.set(key,value);
    query.set("format", exportFormat);
    const path=scope==="building"?`/api/projects/${type}/export`:`/api/project-summary/${type}`;
    return `${path}?${query}`;
  }
  function download(){ window.location.href=exportUrl(format); }
  const row={display:"flex",alignItems:"center",gap:8} as const;
  const controlId=`${type}-${filters.id??"all"}`;
  return <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",margin:"0 0 14px",padding:"10px 12px",background:"#fff",border:"1px solid var(--line)",borderRadius:9}} aria-label="Dışa aktarma seçenekleri">
    <div style={row}><b>Dosya:</b><label style={row}><input type="radio" name={`format-${controlId}`} checked={format==="xlsx"} onChange={()=>setFormat("xlsx")}/> Excel</label><label style={row}><input type="radio" name={`format-${controlId}`} checked={format==="pdf"} onChange={()=>setFormat("pdf")}/> PDF</label></div>
    <div style={row}><b>Liste:</b><label style={row}><input type="radio" name={`scope-${controlId}`} checked={scope==="building"} onChange={()=>setScope("building")}/> Bina bazlı</label><label style={row}><input type="radio" name={`scope-${controlId}`} checked={scope==="project"} onChange={()=>setScope("project")}/> Proje bazlı</label></div>
    <button type="button" onClick={download}>{format==="pdf"?"PDF İndir":"Excel İndir"}</button>
    <ExcelShareButton url={exportUrl("xlsx")} />
  </div>;
}
