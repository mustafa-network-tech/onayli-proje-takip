import {notFound} from "next/navigation";
import ManualProjectForm from "@/components/ManualProjectForm";
export default async function NewProject({params}:{params:Promise<{type:string}>}){
 const {type}=await params;if(type!=="GF"&&type!=="BF")notFound();
 return <><div className="top"><h1>Yeni {type} Projesi</h1></div><ManualProjectForm type={type}/></>;
}
