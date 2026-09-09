import {readFileSync} from "node:fs";
import Database from "better-sqlite3";
import {Prisma} from "@prisma/client";
import {expect,it,vi} from "vitest";
import {parseProjectIds} from "./project-filters";
const mocks=vi.hoisted(()=>({query:vi.fn()}));
vi.mock("./db",()=>({db:{$queryRaw:mocks.query}}));
import {findExportBuildings} from "./building-export";

it("parses multiple exact IDs with whitespace, commas and semicolons",()=>{
 expect(parseProjectIds("11125522, 21552255\n11125522; 00123")).toEqual(["11125522","21552255","00123"]);
 expect(parseProjectIds("  ")).toEqual([]);
});

it.each(["GF","BF"] as const)("exports exact multiple %s IDs intersected with district and active buildings",async type=>{
 const sqlite=new Database(":memory:");
 try {
  sqlite.exec(readFileSync("migrations/0001_initial.sql","utf8"));
  for(const [i,id] of ["11125522","21552255","111255220"].entries()){
   sqlite.prepare('INSERT INTO HpProject (id,projectId,projectType,updatedAt) VALUES (?,?,?,0)').run(`p${i}`,id,type);
   for(const district of ["A","B"]){
    sqlite.prepare('INSERT INTO HpBuilding (id,projectRefId,sourceKey,district,bbkHp,updatedAt) VALUES (?,?,?,?,10,0)').run(`${i}${district}`,`p${i}`,`${i}${district}`,district);
   }
  }
  mocks.query.mockImplementation((query:Prisma.Sql)=>Promise.resolve(sqlite.prepare(query.sql).all(...query.values)));
  const rows=await findExportBuildings(type,{id:"11125522, 21552255",district:"A"});
  expect(rows.map(r=>r.projectId)).toEqual(["11125522","21552255"]);
  expect(rows.every(r=>r.district==="A")).toBe(true);
  expect(await findExportBuildings(type,{id:"111"})).toEqual([]);
  sqlite.prepare('UPDATE HpBuilding SET isActive=0 WHERE id=?').run("0A");
  expect(await findExportBuildings(type,{id:"11125522",district:"A"})).toEqual([]);
 }finally{sqlite.close()}
});
