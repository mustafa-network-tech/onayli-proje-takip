import {getCloudflareContext} from "@opennextjs/cloudflare";
import {db} from "./db";
import {manualProjectSchema, type ManualProjectInput} from "./manual-project-schema";

export function manualProjectStatements(type:"GF"|"BF",input:ManualProjectInput,userId:string){
 const data=manualProjectSchema.parse(input),id=crypto.randomUUID(),now=Date.now();
 const statements:{sql:string;values:(string|number|null)[]}[]=[{
  sql:'INSERT INTO HpProject (id,projectId,projectType,centralName,projectYear,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)',
  values:[id,data.projectId,type,data.centralName||null,data.projectYear,now,now],
 }];
 for(const b of data.buildings){
  const buildingId=crypto.randomUUID();
  statements.push({sql:'INSERT INTO HpBuilding (id,projectRefId,sourceKey,district,neighborhood,street,doorNumber,buildingName,uavt,bbkHp,pstn,dsl,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
   values:[buildingId,id,`M:${buildingId}`,b.district,b.neighborhood||null,b.street||null,b.doorNumber,b.buildingName||null,b.uavt||null,b.bbkHp,type==="BF"?b.pstn:null,type==="BF"?b.dsl:null,now,now]});
  if(b.description)statements.push({sql:'INSERT INTO HpBuildingNote (id,buildingId,note,createdBy,createdAt) VALUES (?,?,?,?,?)',values:[crypto.randomUUID(),buildingId,b.description,userId,now]});
  statements.push({sql:'INSERT INTO HpBuildingHistory (id,buildingId,actionType,description,createdBy,createdAt) VALUES (?,?,?,?,?,?)',values:[crypto.randomUUID(),buildingId,"MANUAL_CREATE","Bina manuel proje girişiyle oluşturuldu.",userId,now]});
 }
 return {id,statements};
}

export async function createManualProject(type:"GF"|"BF",input:ManualProjectInput,userId:string){
 const {id,statements}=manualProjectStatements(type,input,userId);
 if(process.env.NODE_ENV==="development"){
  await db.$transaction(async tx=>{for(const s of statements)await tx.$executeRawUnsafe(s.sql,...s.values)});
 }else{
  const {env}=getCloudflareContext();
  await env.DB.batch(statements.map(s=>env.DB.prepare(s.sql).bind(...s.values)));
 }
 return {id};
}
