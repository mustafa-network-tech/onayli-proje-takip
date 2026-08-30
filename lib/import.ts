import { db } from "./db";
import { parseWorkbook } from "./excel";
import type { ImportPreview, ParsedBuilding, ProjectImportDecision, ProjectType } from "./hp-types";

const sourceData=(r:ParsedBuilding)=>({uavt:r.uavt,district:r.district,neighborhood:r.neighborhood,street:r.street,buildingName:r.buildingName,doorNumber:r.doorNumber,bbkHp:r.bbkHp,pstn:r.pstn,dsl:r.dsl,infrastructureStatus:r.infrastructureStatus,workProgressDate:r.workProgressDate,rekorDate:r.rekorDate,equivalentBuildingCode:r.equivalentBuildingCode,csbmCode:r.csbmCode});
const groupRows=(rows:ParsedBuilding[])=>{const map=new Map<string,ParsedBuilding[]>();for(const row of rows)map.set(row.projectId,[...(map.get(row.projectId)??[]),row]);return map};

export async function previewImport(buffer:Buffer,fileName:string,projectType:ProjectType):Promise<ImportPreview>{
 const parsed=parseWorkbook(buffer,projectType),grouped=groupRows(parsed.rows),projectIds=[...grouped.keys()];
 const existing=await db.hpProject.findMany({where:{projectType,projectId:{in:projectIds}},include:{buildings:true}}),existingById=new Map(existing.map(p=>[p.projectId,p]));
 const decisions:ProjectImportDecision[]=[];const acceptedRows:ParsedBuilding[]=[];
 for(const [projectId,rows] of grouped){
  const current=existingById.get(projectId);
  if(!current){decisions.push({projectId,accepted:true,action:"CREATE",rowCount:rows.length,reason:"Yeni Proje ID; yeşil satırlar tamamlanmış olarak kaydedilecek"});acceptedRows.push(...rows);continue}
  decisions.push({projectId,accepted:true,action:"REPLACE",rowCount:rows.length,reason:"Mevcut proje yeni Excel ile değiştirilecek; yeşil satırlar imalat tamam olarak alınacak"});acceptedRows.push(...rows);
 }
 const accepted=decisions.filter(d=>d.accepted),rejected=decisions.filter(d=>!d.accepted),newProjects=accepted.filter(d=>d.action==="CREATE").length,replacedProjects=accepted.filter(d=>d.action==="REPLACE").length;
 return {fileName,projectType,totalRows:parsed.totalRows,projectCount:projectIds.length,buildingCount:acceptedRows.length,acceptedProjects:accepted.length,rejectedProjects:rejected.length,acceptedRows:acceptedRows.length,rejectedRows:rejected.reduce((n,d)=>n+d.rowCount,0),newProjects,replacedProjects,existingProjects:existing.length,newBuildings:acceptedRows.length,updatedBuildings:0,unchangedBuildings:0,archivedBuildings:0,decisions,errors:parsed.errors,rows:acceptedRows};
}

export async function commitImport(preview:ImportPreview,userId:string){
 return db.$transaction(async tx=>{
  const log=await tx.hpExcelImport.create({data:{projectType:preview.projectType,fileName:preview.fileName,importedBy:userId,totalRows:preview.totalRows,newProjects:preview.newProjects,newBuildings:preview.newBuildings,updatedBuildings:preview.replacedProjects,skippedRows:preview.rejectedRows,errorRows:preview.errors.length,status:"COMPLETED",errorReport:preview.errors.length?JSON.stringify(preview.errors):null}});
  const grouped=groupRows(preview.rows),replaceIds=new Set(preview.decisions.filter(d=>d.accepted&&d.action==="REPLACE").map(d=>d.projectId));
  for(const [projectId,rows] of grouped){
   if(replaceIds.has(projectId))await tx.hpProject.delete({where:{projectId_projectType:{projectId,projectType:preview.projectType}}});
   const first=rows[0],project=await tx.hpProject.create({data:{projectId,projectType:preview.projectType,centralName:first.centralName,projectYear:first.projectYear,lastImportId:log.id}});
   const now=new Date();await tx.hpBuilding.createMany({data:rows.map(row=>({projectRefId:project.id,sourceKey:row.sourceKey,isActive:true,...sourceData(row),cableCompleted:row.excelCompleted,cableCompletedAt:row.excelCompleted?now:null,spliceCompleted:row.excelCompleted,spliceCompletedAt:row.excelCompleted?now:null,obkCompleted:preview.projectType==="BF"&&row.excelCompleted,obkCompletedAt:preview.projectType==="BF"&&row.excelCompleted?now:null}))});
  }
  return log;
 });
}
