import {requireUser} from "@/lib/auth";
import {manualProjectSchema} from "@/lib/manual-project-schema";
import {createManualProject} from "@/lib/manual-project";

export async function POST(request:Request,{params}:{params:Promise<{type:string}>}){
 let user;
 try{user=await requireUser(request)}catch{return Response.json({error:"Oturum gerekli."},{status:401})}
 const {type}=await params;
 if(type!=="GF"&&type!=="BF")return Response.json({error:"Geçersiz proje türü."},{status:400});
 try{
  const input=manualProjectSchema.safeParse(await request.json());
  if(!input.success)return Response.json({error:input.error.issues[0].message},{status:400});
  return Response.json({project:await createManualProject(type,input.data,user.id)},{status:201});
 }catch(error){
  if(/unique constraint|P2002/i.test(String(error)))return Response.json({error:"Bu türde aynı Proje ID zaten kayıtlı. Farklı bir ID girin."},{status:409});
  return Response.json({error:"Proje kaydedilemedi. Alanları kontrol edip tekrar deneyin."},{status:400});
 }
}
