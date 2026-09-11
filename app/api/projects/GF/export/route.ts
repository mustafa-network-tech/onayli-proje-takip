import {statusMatch} from "@/lib/project-filters";
import {a4LandscapeExcelBuffer} from "@/lib/excel-print";
import {requireUser} from "@/lib/auth";
import {formatProgress,manufacturing} from "@/lib/stats";
import * as XLSX from "xlsx-js-style";
import PDFDocument from "pdfkit";
import path from "node:path";
import fs from "node:fs";
import {findExportBuildings} from "@/lib/building-export";

export const dynamic="force-dynamic";
type BuildingRow={projectId:string;central:string;district:string;neighborhood:string;street:string;doorNumber:string;uavt:string;hp:number;cable:string;splice:string;status:string;progress:string;description:string;completed:boolean;cancelled:boolean};
const columns=["Proje ID","Proje","Santral","İlçe","Mahalle","Cadde / Sokak","Bina No","HP","Açıklama"];

export async function GET(request:Request){
 try{
  await requireUser(request);const url=new URL(request.url),format=url.searchParams.get("format"),district=url.searchParams.get("district")?.trim()||undefined,id=url.searchParams.get("id")?.trim()||undefined,year=url.searchParams.get("year")?.trim()||undefined,status=url.searchParams.get("status")?.trim()||undefined;
  if(format!=="xlsx"&&format!=="pdf")return Response.json({error:"Format xlsx veya pdf olmalıdır"},{status:400});
  const buildings=await findExportBuildings("GF",{district,id,year});
  const rows:BuildingRow[]=buildings.map(b=>{const stage=manufacturing({cableCompleted:Boolean(b.cableCompleted),spliceCompleted:Boolean(b.spliceCompleted),obkCompleted:Boolean(b.obkCompleted),isCancelled:Boolean(b.isCancelled)},"GF");return {projectId:b.projectId,central:b.centralName??"—",district:b.district??"—",neighborhood:b.neighborhood??"—",street:b.street??"—",doorNumber:b.doorNumber??"—",uavt:b.uavt??"—",hp:b.bbkHp,cable:b.cableCompleted?"Tamam":"Bekliyor",splice:b.spliceCompleted?"Tamam":"Bekliyor",status:stage.status,progress:`%${formatProgress(stage.percent)}`,description:b.description??"",completed:stage.percent===100,cancelled:Boolean(b.isCancelled)}}).filter(r=>statusMatch(Number(r.progress.slice(1)),status,r.cancelled));
  const stamp=fileStamp(),districtSuffix=district?`-${safeName(district)}`:"",baseName=`GF-Bina-Listesi${districtSuffix}-${stamp}`;
  return format==="xlsx"?excelResponse(rows,baseName):pdfResponse(rows,district,baseName);
 }catch(e){return Response.json({error:e instanceof Error?e.message:"Dışa aktarma başarısız"},{status:400})}
}

function excelResponse(rows:BuildingRow[],baseName:string){
 const data:Array<Record<string,string|number>>=rows.map(toRecord);data.push({"Proje ID":`TOPLAM (${rows.filter(r=>r.completed).length} / ${rows.length} BİNA)`,"Proje":"","Santral":"","İlçe":"","Mahalle":"","Cadde / Sokak":"","Bina No":"","HP":totalHp(rows),"Açıklama":""});
 const sheet=XLSX.utils.json_to_sheet(data),book=XLSX.utils.book_new();sheet["!cols"]=[22,9,20,18,22,30,12,9,45].map(wch=>({wch}));
 sheet["!rows"]=[{hpt:28},...rows.map(()=>({hpt:18})),{hpt:30}];
 const border=Object.fromEntries(["top","bottom","left","right"].map(side=>[side,{style:"thin",color:{rgb:"52606D"}}]));
 for(let r=0;r<=rows.length+1;r++)styleRow(sheet,r,{border,alignment:{wrapText:true,vertical:"top"},...(r===0?{font:{bold:true,sz:12},fill:{patternType:"solid",fgColor:{rgb:"D9EAF7"}}}:{})});
 const completedStyle={fill:{patternType:"solid",fgColor:{rgb:"C6EFCE"}},font:{color:{rgb:"17212B"}}},totalStyle={fill:{patternType:"solid",fgColor:{rgb:"D9EAF7"}},font:{bold:true,color:{rgb:"17212B"}}};rows.forEach((b,index)=>{if(b.cancelled)styleRow(sheet,index+1,{fill:{patternType:"solid",fgColor:{rgb:"FFC7CE"}},font:{color:{rgb:"9C0006"}}});else if(b.completed)styleRow(sheet,index+1,completedStyle)});styleRow(sheet,rows.length+1,totalStyle);XLSX.utils.book_append_sheet(book,sheet,"GF Bina Listesi");
 return fileResponse(a4LandscapeExcelBuffer(book),`${baseName}.xlsx`,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

async function pdfResponse(rows:BuildingRow[],district:string|undefined,baseName:string){
 const doc=new PDFDocument({size:"A4",layout:"landscape",margin:18}),chunks:Buffer[]=[];doc.on("data",c=>chunks.push(c));const done=new Promise<Buffer>((resolve,reject)=>{doc.on("end",()=>resolve(Buffer.concat(chunks)));doc.on("error",reject)}),font=path.join(process.env.WINDIR??"C:\\Windows","Fonts","arial.ttf");if(fs.existsSync(font))doc.font(font);const widths=[76,34,85,70,85,115,50,40,250],tableWidth=805,header=()=>{doc.fontSize(15).fillColor("#17212B").text("GF BİNA LİSTESİ",{align:"center"});doc.fontSize(8).text(district?`İlçe: ${district}`:"Tüm ilçeler",{align:"center"});doc.moveDown(.5)};header();
 const draw=(values:(string|number)[],options:{header?:boolean;completedStyle?:boolean;cancelled?:boolean;total?:boolean}={})=>{const h=options.header?38:48;if(doc.y+h>doc.page.height-18){doc.addPage();header();draw(columns,{header:true})}const y=doc.y;if(options.completedStyle)doc.save().fillColor("#C6EFCE").rect(18,y,tableWidth,h).fill().restore();if(options.cancelled)doc.save().fillColor("#FFC7CE").rect(18,y,tableWidth,h).fill().restore();if(options.total)doc.save().fillColor("#D9EAF7").rect(18,y,tableWidth,h).fill().restore();doc.save().lineWidth(1).strokeColor("#52606D").rect(18,y,tableWidth,h).stroke();let gx=18;for(const w of widths.slice(0,-1)){gx+=w;doc.moveTo(gx,y).lineTo(gx,y+h)}doc.stroke().restore();let x=18;doc.fillColor("#17212B").fontSize(options.header?7:7.4);values.forEach((v,i)=>{doc.text(String(v??""),x+2,y+4,{width:widths[i]-4,height:h-8,ellipsis:true,lineGap:1});x+=widths[i]});doc.y=y+h};
 draw(columns,{header:true});rows.forEach(r=>draw(Object.values(toRecord(r)),{completedStyle:r.completed,cancelled:r.cancelled}));draw([`TOPLAM ${rows.filter(r=>r.completed).length} / ${rows.length}`,"","","","","","",totalHp(rows),""],{total:true});doc.end();return fileResponse(await done,`${baseName}.pdf`,"application/pdf");
}
function toRecord(b:BuildingRow){return {"Proje ID":b.projectId,"Proje":"GF","Santral":b.central,"İlçe":b.district,"Mahalle":b.neighborhood,"Cadde / Sokak":b.street,"Bina No":b.doorNumber,"HP":b.hp,"Açıklama":b.cancelled?`İPTAL${b.description?" — "+b.description:""}`:b.description}}
function styleRow(sheet:XLSX.WorkSheet,row:number,style:object){for(let col=0;col<columns.length;col++){const address=XLSX.utils.encode_cell({r:row,c:col});if(sheet[address])sheet[address].s={...sheet[address].s,...style}}}
function totalHp(rows:BuildingRow[]){return rows.reduce((sum,row)=>sum+row.hp,0)}
function hpTotal(rows:BuildingRow[]){return `${rows.reduce((sum,row)=>sum+(row.completed?row.hp:0),0)} / ${totalHp(rows)}`}
function fileStamp(){const p=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).formatToParts(new Date()),v=(t:string)=>p.find(x=>x.type===t)?.value;return `${v("year")}-${v("month")}-${v("day")}_${v("hour")}-${v("minute")}-${v("second")}`}
function safeName(value:string){return value.normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-|-$/g,"")||"ilce"}
function fileResponse(data:Buffer,name:string,type:string){return new Response(new Uint8Array(data),{headers:{"Content-Type":type,"Content-Disposition":`attachment; filename=\"${name}\"`,"Cache-Control":"no-store"}})}
