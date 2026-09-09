import {z} from "zod";
const text=z.string().trim().max(200).default("");
const count=z.number().int().min(0).max(1000000);
export const manualProjectSchema=z.object({
 projectId:z.string().trim().min(1,"Proje ID gerekli.").max(100).regex(/^[^\s,;]+$/,"Tek bir Proje ID girin."),
 centralName:text, projectYear:z.number().int().min(1900).max(2200).nullable(),
 buildings:z.array(z.object({
  district:z.string().trim().min(1,"İlçe gerekli.").max(200),neighborhood:text,street:text,
  doorNumber:z.string().trim().min(1,"Bina no gerekli.").max(200),buildingName:text,uavt:text,
  bbkHp:count,pstn:count.nullable().default(null),dsl:count.nullable().default(null),
  description:z.string().trim().max(5000).default(""),
 })).min(1,"En az bir bina ekleyin.").max(100,"Bir defada en fazla 100 bina eklenebilir."),
}).superRefine((data,ctx)=>{
 const seen=new Set<string>();
 data.buildings.forEach((b,i)=>{
  const key=(b.uavt?`U:${b.uavt}`:[b.district,b.neighborhood,b.street,b.doorNumber,b.buildingName].join("|")).toLocaleUpperCase("tr-TR");
  if(seen.has(key))ctx.addIssue({code:"custom",path:["buildings",i],message:`${i+1}. bina listede tekrar ediyor.`});
  seen.add(key);
 });
});
export type ManualProjectInput=z.infer<typeof manualProjectSchema>;
