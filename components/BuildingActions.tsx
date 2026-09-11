"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function BuildingActions({id,type,initial,cancelled=false}:{id:string;type:string;initial:{cable:boolean;splice:boolean;obk:boolean};cancelled?:boolean}){
  const router=useRouter(); const [busy,setBusy]=useState("");
  async function toggle(field:string,value:boolean){setBusy(field);const r=await fetch(`/api/buildings/${id}/progress`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({field,value})});if(!r.ok)alert((await r.json()).error);else router.refresh();setBusy("")}
  async function cancel(){
    if(!confirm(cancelled?"Bina iptali geri alınsın mı?":"Bu bina iptal edilsin mi? Tamamlanmayan listesinden çıkarılacak."))return;
    setBusy("cancel");
    try{const r=await fetch(`/api/buildings/${id}/cancel`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({cancelled:!cancelled})});const data=await r.json();if(!r.ok)throw new Error(data.error);router.refresh()}
    catch(error){alert(error instanceof Error?error.message:"İşlem tamamlanamadı.")}finally{setBusy("")}
  }
  return <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button className="secondary" disabled={!!busy||cancelled} onClick={()=>toggle("cable",!initial.cable)}>Kablo {initial.cable?"✓":"○"}</button><button className="secondary" disabled={!!busy||cancelled} onClick={()=>toggle("splice",!initial.splice)}>Ek {initial.splice?"✓":"○"}</button>{type==="BF"&&<button className="secondary" disabled={!!busy||cancelled} onClick={()=>toggle("obk",!initial.obk)}>OBK {initial.obk?"✓":"○"}</button>}<button style={{background:"#a63d40"}} disabled={!!busy} onClick={cancel}>{cancelled?"İptali Geri Al":"İptal Et"}</button></div>
}

export function NoteForm({id}:{id:string}){
  const router=useRouter(); const [note,setNote]=useState("");
  async function submit(e:React.FormEvent){e.preventDefault();const r=await fetch(`/api/buildings/${id}/notes`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({note})});if(r.ok){setNote("");router.refresh()}else alert((await r.json()).error)}
  return <form onSubmit={submit} className="filters"><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Hızlı not ekle" required maxLength={2000}/><button>Not Ekle</button></form>
}
