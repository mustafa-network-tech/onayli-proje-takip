"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {manualProjectSchema} from "@/lib/manual-project-schema";

export default function ManualProjectForm({type}:{type:"GF"|"BF"}){
 const router=useRouter();
 const [buildings,setBuildings]=useState([0]),[nextId,setNextId]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const form=new FormData(event.currentTarget),value=(name:string)=>String(form.get(name)??"");
  const input=manualProjectSchema.safeParse({projectId:value("projectId"),centralName:value("centralName"),projectYear:value("projectYear")?Number(value("projectYear")):null,
   buildings:buildings.map(id=>({district:value(`${id}.district`),neighborhood:value(`${id}.neighborhood`),street:value(`${id}.street`),doorNumber:value(`${id}.doorNumber`),buildingName:value(`${id}.buildingName`),uavt:value(`${id}.uavt`),bbkHp:Number(value(`${id}.bbkHp`)),pstn:value(`${id}.pstn`)?Number(value(`${id}.pstn`)):null,dsl:value(`${id}.dsl`)?Number(value(`${id}.dsl`)):null,description:value(`${id}.description`)}))});
  if(!input.success){setError(input.error.issues[0].message);return}
  setBusy(true);setError("");
  try{
   const response=await fetch(`/api/projects/${type}/manual`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input.data)});
   const result=await response.json();if(!response.ok)throw new Error(result.error??"Kayıt başarısız.");
   router.push(`/projects/${type}/${result.project.id}`);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Kayıt başarısız.");setBusy(false)}
 }
 return <form onSubmit={submit} className="card">
  <p>Proje bilgilerini ve binaya ait adres/HP bilgilerini girin. Binalar “Başlanmadı” durumunda oluşturulur; imalat adımlarını proje detayından güncelleyebilirsiniz.</p>
  <fieldset disabled={busy} style={{border:0,padding:0}}>
   <div className="grid"><label>Proje ID *<input name="projectId" required maxLength={100}/></label><label>Santral<input name="centralName" maxLength={200}/></label><label>Proje Yılı<input name="projectYear" type="number" min={1900} max={2200} step={1}/></label></div>
   {buildings.map((id,index)=><section key={id} className="card section">
    <div className="top"><h2>{index+1}. Bina</h2>{buildings.length>1&&<button type="button" className="secondary" onClick={()=>setBuildings(rows=>rows.filter(x=>x!==id))}>Binayı kaldır</button>}</div>
    <div className="grid">{([["district","İlçe",true],["neighborhood","Mahalle",false],["street","Cadde / Sokak",false],["doorNumber","Bina No",true],["buildingName","Bina Adı",false],["uavt","UAVT",false]] as const).map(([field,label,required])=><label key={field}>{label}{required?" *":""}<input name={`${id}.${field}`} required={required} maxLength={200}/></label>)}
     <label>HP *<input name={`${id}.bbkHp`} type="number" required min={0} max={1000000} step={1}/></label>
     {type==="BF"&&["pstn","dsl"].map(field=><label key={field}>{field.toUpperCase()}<input name={`${id}.${field}`} type="number" min={0} max={1000000} step={1}/></label>)}
    </div><label>Açıklama<textarea name={`${id}.description`} rows={2} maxLength={5000}/></label>
   </section>)}
   <div className="filters section"><button type="button" className="secondary" disabled={buildings.length>=100} onClick={()=>{setBuildings(rows=>[...rows,nextId]);setNextId(n=>n+1)}}>+ Bina Ekle</button><button type="submit">{busy?"Kaydediliyor…":"Projeyi Kaydet"}</button>{!busy&&<Link href={`/projects/${type}`}>Vazgeç</Link>}</div>
  </fieldset>{error&&<p role="alert" className="error">{error}</p>}
 </form>;
}
