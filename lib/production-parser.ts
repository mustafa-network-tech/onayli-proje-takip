import type {ProductionEntryInput,ProductionPreview,ProductionUnit,UnknownProductionLine} from "./production-types";

export const normalizeTeamName=(v:string)=>v.trim().replace(/\s+/g," ").toLocaleUpperCase("tr-TR");
const clean=(v:string)=>v.replace(/\s+/g," ").trim();
const upper=(v:string)=>clean(v).toLocaleUpperCase("tr-TR");
const normalizeUnit=(v:string):ProductionUnit|null=>/^(M|MT|METRE|METRELER)$/i.test(v)?"METRE":/^(AD|ADET|TANE)$/i.test(v)?"ADET":null;

export function parseProductionLine(text:string,teamName:string):ProductionEntryInput|null{
 const originalText=clean(text),u=upper(originalText).replace(/^\d+\s*:\s*/,"");if(!originalText||/^(NOT|AÇIKLAMA|ACIKLAMA|UYARI)\s*[:-]?/i.test(u))return null;
 const amount=u.match(/(\d+(?:[.,]\d+)?)\s*(METRELER|METRE|ADET|TANE|MT\b|M\b|AD\b)/i)||u.match(/\b(METRELER|METRE|MT|M|ADET|AD|TANE)\s*(\d+(?:[.,]\d+)?)/i);
 if(!amount)return null;const reversed=!/^\d/.test(amount[1]);const quantity=Number((reversed?amount[2]:amount[1]).replace(",",".")),unit=normalizeUnit(reversed?amount[1]:amount[2]);if(!quantity||!unit)return null;
 const dimension=u.match(/\(?\s*(\d+)\s*[*X×]\s*(\d+)\s*\)?/i),compact=u.replace(/[\s-]/g,"");const familyMatch=u.match(/(\d+)\s*G?\s*FO\s*[- ]?\s*([YH])/i);let category="",subtype:string|null=null,cableCapacity:number|null=null,cableFamily:"FOY"|"FOH"|null=null;
 if(compact.includes("KABLOÇEKİMİ")||compact.includes("KABLOCEKIMI")){category="KABLO ÇEKİMİ";if(familyMatch){cableCapacity=Number(familyMatch[1]);cableFamily=familyMatch[2]==="Y"?"FOY":"FOH";subtype=`${cableCapacity} ${cableFamily}`}}
 else if(/\bKAZI\b/i.test(u)){category="KAZI";if(dimension)subtype=`${dimension[1]}x${dimension[2]}`}
 else {const known:[[string,string],...[string,string][]]=[["EKODASIBULMAYÜKSELTME","EK ODASI BULMA-YÜKSELTME"],["EKODASIÖRME","EK ODASI ÖRME"],["EKODASIMONTAJI","EK ODASI MONTAJI"],["GÖÇÜKTESPİTVETAMİRATI","GÖÇÜK TESPİT VE TAMİRATI"],["SURVEY","SURVEY"]];category=known.find(([needle])=>compact.includes(needle))?.[1]??"";if(!category){let name=u.replace(amount[0]," ").replace(/\([^)]*\)/g," ").replace(/\b\d+\s*G?\s*FO\s*[- ]?\s*[YH]\b/g," ").replace(/\s+/g," ").trim();if(name.split(" ").filter(Boolean).length>=2)category=name}}
 if(!category)return null;return {teamName:clean(teamName),category,subtype,cableCapacity,cableFamily,quantity,unit,originalText};
}

export function parseProductionText(text:string,fileName="upload.pdf",fingerprint=""):ProductionPreview{
 const lines=text.split(/\r?\n/).map(clean).filter(Boolean);const dateText=text.match(/TAR[İI]H\s*:?\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})/i);const workDate=dateText?`${dateText[3]}-${dateText[2].padStart(2,"0")}-${dateText[1].padStart(2,"0")}`:"";let team:string|null=null;const entries:ProductionEntryInput[]=[],unknown:UnknownProductionLine[]=[],ignored:string[]=[];
 for(const line of lines){const teamMatch=line.match(/EK[İI]P\s*ADI\s*:\s*(.+)/i);if(teamMatch){team=clean(teamMatch[1]);continue}const content=line.replace(/^\d+\s*:\s*/,"");if(/^(NOT|AÇIKLAMA|ACIKLAMA|UYARI)\s*[:-]?/i.test(content)){ignored.push(line);continue}if(/TAR[İI]H\s*:/i.test(line)||/(İŞ|IS)\s*\/?\s*PROJE|PROJE\s*ID/i.test(line)||/\b(CD\.|SK\.|SOKAK|TTVPN|KONAĞI|JANDARMA)\b/i.test(line)||/^\(?F[HO0][A-Z0-9]+\)?$/i.test(line)){ignored.push(line);continue}if(!team)continue;const entry=parseProductionLine(line,team);if(entry)entries.push(entry);else if(/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(line))unknown.push({teamName:team,text:line,reason:"Miktar, birim ve anlamlı imalat adı birlikte algılanamadı"})}
 return {fileName,fingerprint,workDate,teams:[...new Map(entries.map(e=>[normalizeTeamName(e.teamName),e.teamName])).values()],entries,unknown,ignored,duplicate:false};
}
