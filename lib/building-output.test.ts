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
 const archive=XLSX.CFB.read(buffer,{type:"buffer"});
 const styles=Buffer.from(XLSX.CFB.find(archive,"/xl/styles.xml").content).toString("utf8");
 for(const side of ["left","right","top","bottom"])expect(styles).toContain(`<${side} style="thin">`);
});
