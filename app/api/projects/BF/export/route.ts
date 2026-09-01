import {requireUser} from "@/lib/auth";
import {formatProgress,manufacturing} from "@/lib/stats";
import * as XLSX from "xlsx-js-style";
import PDFDocument from "pdfkit";
import path from "node:path";
import fs from "node:fs";
import {findExportBuildings} from "@/lib/building-export";

export const dynamic="force-dynamic";
type BuildingRow={projectId:string;central:string;district:string;neighborhood:string;street:string;doorNumber:string;uavt:string;hp:number;pstn:number;dsl:number;cable:string;splice:string;obk:string;status:string;progress:string;description:string;completed:boolean};
const columns=["Proje ID","Santral","İlçe","Mahalle","Cadde / Sokak","Bina No","UAVT","HP","PSTN","DSL","Kablo","Ek","OBK","Durum","İlerleme","Açıklama"];

export async function GET(request:Request){
 try{
  await requireUser(request);const url=new URL(request.url),format=url.searchParams.get("format"),district=url.searchParams.get("district")?.trim()||undefined,id=url.searchParams.get("id")?.trim()||undefined,year=url.searchParams.get("year")?.trim()||undefined,status=url.searchParams.get("status")?.trim()||undefined;
  if(format!=="xlsx"&&format!=="pdf")return Response.json({error:"Format xlsx veya pdf olmalıdır"},{status:400});
  const buildings=await findExportBuildings("BF",{district,id,year});
  const rows:BuildingRow[]=buildings.map(b=>{const stage=manufacturing({cableCompleted:Boolean(b.cableCompleted),spliceCompleted:Boolean(b.spliceCompleted),obkCompleted:Boolean(b.obkCompleted)},"BF");return {projectId:b.projectId,central:b.centralName??"—",district:b.district??"—",neighborhood:b.neighborhood??"—",street:b.street??"—",doorNumber:b.doorNumber??"—",uavt:b.uavt??"—",hp:b.bbkHp,pstn:b.pstn??0,dsl:b.dsl??0,cable:b.cableCompleted?"Tamam":"Bekliyor",splice:b.spliceCompleted?"Tamam":"Bekliyor",obk:b.obkCompleted?"Tamam":"Bekliyor",status:stage.status,progress:`%${formatProgress(stage.percent)}`,description:b.description??"",completed:stage.percent===100}}).filter(r=>status==="completed"?r.completed:status==="not_started"?r.status==="Başlanmadı":status==="ongoing"?r.status==="Devam Ediyor":true);
  const stamp=fileStamp(),districtSuffix=district?`-${safeName(district)}`:"",baseName=`BF-Bina-Listesi${districtSuffix}-${stamp}`;
  return format==="xlsx"?excelResponse(rows,baseName):pdfResponse(rows,district,baseName);
 }catch(e){return Response.json({error:e instanceof Error?e.message:"Dışa aktarma başarısız"},{status:400})}
}

function excelResponse(rows:BuildingRow[],baseName:string){
 const data:Array<Record<string,string|number>>=rows.map(toRecord);data.push({"Proje ID":`GENEL TOPLAM (${rows.length} BİNA)`,"Santral":"","İlçe":"","Mahalle":"","Cadde / Sokak":"","Bina No":"","UAVT":"","HP":hpTotal(rows),"PSTN":total(rows,"pstn"),"DSL":total(rows,"dsl"),"Kablo":rows.filter(x=>x.cable==="Tamam").length,"Ek":rows.filter(x=>x.splice==="Tamam").length,"OBK":rows.filter(x=>x.obk==="Tamam").length,"Durum":`${rows.filter(x=>x.completed).length} tamamlanan`,"İlerleme":"","Açıklama":""});
 const sheet=XLSX.utils.json_to_sheet(data),book=XLSX.utils.book_new();sheet["!cols"]=[{wch:15},{wch:20},{wch:18},{wch:22},{wch:30},{wch:12},{wch:16},{wch:8},{wch:8},{wch:8},{wch:11},{wch:11},{wch:11},{wch:16},{wch:11},{wch:45}];
 const yellow={fill:{patternType:"solid",fgColor:{rgb:"FFF2CC"}},font:{color:{rgb:"17212B"}}},totalStyle={fill:{patternType:"solid",fgColor:{rgb:"D9EAF7"}},font:{bold:true,color:{rgb:"17212B"}}};
 rows.forEach((b,index)=>{if(b.completed)styleRow(sheet,index+1,yellow)});styleRow(sheet,rows.length+1,totalStyle);XLSX.utils.book_append_sheet(book,sheet,"BF Bina Listesi");
 const buffer=XLSX.write(book,{type:"buffer",bookType:"xlsx"});return fileResponse(buffer,`${baseName}.xlsx`,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

async function pdfResponse(rows:BuildingRow[],district:string|undefined,baseName:string){
 const doc=new PDFDocument({size:"A4",layout:"portrait",margin:18}),chunks:Buffer[]=[];doc.on("data",c=>chunks.push(c));const done=new Promise<Buffer>((resolve,reject)=>{doc.on("end",()=>resolve(Buffer.concat(chunks)));doc.on("error",reject)}),font=path.join(process.env.WINDIR??"C:\\Windows","Fonts","arial.ttf");if(fs.existsSync(font))doc.font(font);const widths=[32,35,30,32,55,25,40,22,22,22,27,25,25,32,28,107],tableWidth=559,header=()=>{doc.fontSize(15).fillColor("#17212B").text("BF BİNA LİSTESİ",{align:"center"});doc.fontSize(8).text(district?`İlçe: ${district}`:"Tüm ilçeler",{align:"center"});doc.moveDown(.5)};header();
 const draw=(values:(string|number)[],options:{header?:boolean;yellow?:boolean;total?:boolean}={})=>{const h=options.header?42:52;if(doc.y+h>824){doc.addPage();header();draw(columns,{header:true})}const y=doc.y;if(options.yellow)doc.save().fillColor("#FFF2CC").rect(18,y,tableWidth,h).fill().restore();if(options.total)doc.save().fillColor("#D9EAF7").rect(18,y,tableWidth,h).fill().restore();doc.save().lineWidth(1).strokeColor("#52606D").rect(18,y,tableWidth,h).stroke();let gx=18;for(const w of widths.slice(0,-1)){gx+=w;doc.moveTo(gx,y).lineTo(gx,y+h)}doc.stroke().restore();let x=18;doc.fillColor("#17212B").fontSize(options.header?6.6:7);values.forEach((v,i)=>{doc.text(String(v||"—"),x+2,y+4,{width:widths[i]-4,height:h-8,ellipsis:true,lineGap:1});x+=widths[i]});doc.y=y+h};
 draw(columns,{header:true});rows.forEach(r=>draw(Object.values(toRecord(r)),{yellow:r.completed}));draw([`TOPLAM ${rows.length}`,"","","","","","",hpTotal(rows),total(rows,"pstn"),total(rows,"dsl"),rows.filter(x=>x.cable==="Tamam").length,rows.filter(x=>x.splice==="Tamam").length,rows.filter(x=>x.obk==="Tamam").length,`${rows.filter(x=>x.completed).length} tamam`,"",""],{total:true});doc.end();
 return fileResponse(await done,`${baseName}.pdf`,"application/pdf");
}

function toRecord(b:BuildingRow){return {"Proje ID":b.projectId,"Santral":b.central,"İlçe":b.district,"Mahalle":b.neighborhood,"Cadde / Sokak":b.street,"Bina No":b.doorNumber,"UAVT":b.uavt,"HP":b.hp,"PSTN":b.pstn,"DSL":b.dsl,"Kablo":b.cable,"Ek":b.splice,"OBK":b.obk,"Durum":b.status,"İlerleme":b.progress,"Açıklama":b.description}}
function styleRow(sheet:XLSX.WorkSheet,row:number,style:object){for(let col=0;col<columns.length;col++){const address=XLSX.utils.encode_cell({r:row,c:col});if(sheet[address])sheet[address].s=style}}
function total(rows:BuildingRow[],key:"hp"|"pstn"|"dsl"){return rows.reduce((sum,row)=>sum+row[key],0)}
function hpTotal(rows:BuildingRow[]){return `${rows.reduce((sum,row)=>sum+(row.completed?row.hp:0),0)} / ${total(rows,"hp")}`}
function fileStamp(){const p=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).formatToParts(new Date()),v=(t:string)=>p.find(x=>x.type===t)?.value;return `${v("year")}-${v("month")}-${v("day")}_${v("hour")}-${v("minute")}-${v("second")}`}
function safeName(value:string){return value.normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-|-$/g,"")||"ilce"}
function fileResponse(data:Buffer,name:string,type:string){return new Response(new Uint8Array(data),{headers:{"Content-Type":type,"Content-Disposition":`attachment; filename=\"${name}\"`,"Cache-Control":"no-store"}})}
