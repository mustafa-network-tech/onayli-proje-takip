import {expect,it,vi} from "vitest";
import * as XLSX from "xlsx-js-style";
vi.mock("./auth",()=>({requireUser:vi.fn()}));
vi.mock("./building-export",()=>({findExportBuildings:vi.fn(async()=>[
 {projectId:"11125522",centralName:"Merkez",district:"Test",bbkHp:0,cableCompleted:0,spliceCompleted:0,obkCompleted:0,description:""},
 {projectId:"21552255",centralName:"Merkez",district:"Test",bbkHp:20,cableCompleted:1,spliceCompleted:1,obkCompleted:1,description:"Bitti"},
])}));
import {GET as gf} from "../app/api/projects/GF/export/route";
import {GET as bf} from "../app/api/projects/BF/export/route";

it.each([["GF",gf],["BF",bf]] as const)("creates a bordered %s building workbook with only matching status",async(type,get)=>{
 const response=await get(new Request(`http://localhost/api/projects/${type}/export?format=xlsx&status=not_started&id=11125522,21552255&district=Test`));
 expect(response.status).toBe(200);
 const buffer=Buffer.from(await response.arrayBuffer());
 const book=XLSX.read(buffer,{type:"buffer"});
 const data=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1});
 expect(data[0]).toEqual(["Proje ID","Proje","Santral","İlçe","Mahalle","Cadde / Sokak","Bina No","HP","Açıklama"]);
 expect(data).toHaveLength(3);
 expect(data[1]).toEqual(["11125522",type,"Merkez","Test","—","—","—",0,""]);
 expect((data[2] as string[])[0]).toBe("TOPLAM (0 / 1 BİNA)");
 const archive=XLSX.CFB.read(buffer,{type:"buffer"});
 const xml=Buffer.from(XLSX.CFB.find(archive,"/xl/worksheets/sheet1.xml").content).toString("utf8");
 expect(xml).toMatch(/<row\b[^>]*r="1"[^>]*ht="28"/);
 expect(xml).toMatch(/<row\b[^>]*r="2"[^>]*ht="18"/);
 expect(xml).toMatch(/<row\b[^>]*r="3"[^>]*ht="30"/);
 expect(xml).toContain('<pageSetUpPr fitToPage="1"/>');
 expect(xml).toContain('<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>');
 expect(book.Workbook?.Names).toEqual(expect.arrayContaining([
  expect.objectContaining({Name:"_xlnm.Print_Area",Ref:`'${type} Bina Listesi'!$A$1:$I$3`}),
  expect.objectContaining({Name:"_xlnm.Print_Titles",Ref:`'${type} Bina Listesi'!$1:$1`}),
 ]));
 const styles=Buffer.from(XLSX.CFB.find(archive,"/xl/styles.xml").content).toString("utf8");
 for(const side of ["left","right","top","bottom"])expect(styles).toContain(`<${side} style="thin">`);
});

it.each([["GF",gf],["BF",bf]] as const)("exports %s completed / total for all and incomplete lists",async(type,get)=>{
 for(const [status,expected] of [["","TOPLAM (1 / 2 BİNA)"],["incomplete","TOPLAM (0 / 1 BİNA)"],["completed","TOPLAM (1 / 1 BİNA)"]]){
  const response=await get(new Request(`http://localhost/api/projects/${type}/export?format=xlsx&status=${status}`));
  expect(response.status).toBe(200);
  const book=XLSX.read(Buffer.from(await response.arrayBuffer()),{type:"buffer"});
  const rows=XLSX.utils.sheet_to_json<string[]>(book.Sheets[book.SheetNames[0]],{header:1});
  expect(rows.at(-1)?.[0]).toBe(expected);
 }
});
