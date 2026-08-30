"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function BuildingActions({id,type,initial}:{id:string;type:string;initial:{cable:boolean;splice:boolean;obk:boolean}}){
  const router=useRouter(); const [busy,setBusy]=useState("");
  async function toggle(field:string,value:boolean){setBusy(field);const r=await fetch(`/api/buildings/${id}/progress`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({field,value})});if(!r.ok)alert((await r.json()).error);else router.refresh();setBusy("")}
  return <div style={{display:"flex",gap:6}}><button className="secondary" disabled={!!busy} onClick={()=>toggle("cable",!initial.cable)}>Kablo {initial.cable?"✓":"○"}</button><button className="secondary" disabled={!!busy} onClick={()=>toggle("splice",!initial.splice)}>Ek {initial.splice?"✓":"○"}</button>{type==="BF"&&<button className="secondary" disabled={!!busy} onClick={()=>toggle("obk",!initial.obk)}>OBK {initial.obk?"✓":"○"}</button>}</div>
}

export function NoteForm({id}:{id:string}){
  const router=useRouter(); const [note,setNote]=useState("");
  async function submit(e:React.FormEvent){e.preventDefault();const r=await fetch(`/api/buildings/${id}/notes`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({note})});if(r.ok){setNote("");router.refresh()}else alert((await r.json()).error)}
  return <form onSubmit={submit} className="filters"><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Hızlı not ekle" required maxLength={2000}/><button>Not Ekle</button></form>
}
