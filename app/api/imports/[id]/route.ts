import {db} from "@/lib/db";
import {requireUser} from "@/lib/auth";

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  await requireUser(request);const {id}=await params;
  const item=await db.hpExcelImport.findUnique({where:{id}});
  if(!item)return Response.json({error:"Excel import kaydı bulunamadı"},{status:404});
  const result=await db.$transaction(async tx=>{
   const projects=await tx.hpProject.findMany({where:{lastImportId:id},select:{id:true}}),projectIds=projects.map(p=>p.id);
   const buildingCount=projectIds.length?await tx.hpBuilding.count({where:{projectRefId:{in:projectIds}}}):0;
   if(projectIds.length)await tx.hpProject.deleteMany({where:{id:{in:projectIds}}});
   await tx.hpExcelImport.delete({where:{id}});
   return {projects:projectIds.length,buildings:buildingCount};
  });
  return Response.json({ok:true,...result});
 }catch(e){return Response.json({error:e instanceof Error?e.message:"Silme işlemi başarısız"},{status:400})}
}
