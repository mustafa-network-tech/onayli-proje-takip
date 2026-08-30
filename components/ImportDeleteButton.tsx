"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function ImportDeleteButton({id,fileName}:{id:string;fileName:string}){
 const router=useRouter(),[busy,setBusy]=useState(false);
 async function remove(){if(!confirm(`"${fileName}" importu ve bu dosyaya ait TÜM proje, bina, not ve geçmiş kayıtları kalıcı olarak silinecek. Devam edilsin mi?`))return;setBusy(true);const r=await fetch(`/api/imports/${id}`,{method:"DELETE"}),j=await r.json();if(r.ok){alert(`${j.projects} proje ve ${j.buildings} bina silindi.`);router.refresh()}else alert(j.error);setBusy(false)}
 return <button onClick={remove} disabled={busy} style={{background:"#a63d40"}}>{busy?"Siliniyor…":"Dosyayı ve Verileri Sil"}</button>
}
