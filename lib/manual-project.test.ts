import {readFileSync} from "node:fs";
import Database from "better-sqlite3";
import {expect,it,vi} from "vitest";
vi.mock("./db",()=>({db:{}}));
vi.mock("@opennextjs/cloudflare",()=>({getCloudflareContext:vi.fn()}));
import {manualProjectStatements} from "./manual-project";
import {manualProjectSchema} from "./manual-project-schema";
const fixture=()=>({projectId:"001234",centralName:"Merkez",projectYear:2026,buildings:[{district:"MERKEZ",neighborhood:"Test",street:"Cadde",doorNumber:"12",buildingName:"",uavt:"123",bbkHp:10,pstn:3,dsl:4,description:"Saha notu"},{district:"MERKEZ",neighborhood:"Test",street:"Cadde",doorNumber:"14",buildingName:"",uavt:"124",bbkHp:5,pstn:null,dsl:null,description:""}]});
it.each(["GF","BF"] as const)("creates %s project, buildings, notes and history atomically without overwriting duplicates",type=>{
 const sqlite=new Database(":memory:");
 try{
  sqlite.exec(readFileSync("migrations/0001_initial.sql","utf8"));
  sqlite.prepare('INSERT INTO User (id,name,email) VALUES (?,?,?)').run("u","Test","test@example.com");
  const save=(data:ReturnType<typeof manualProjectStatements>)=>sqlite.transaction(()=>{for(const s of data.statements)sqlite.prepare(s.sql).run(...s.values)})();
  const created=manualProjectStatements(type,fixture(),"u");save(created);
  expect(sqlite.prepare('SELECT projectId,projectType,lastImportId FROM HpProject').get()).toEqual({projectId:"001234",projectType:type,lastImportId:null});
  expect(sqlite.prepare('SELECT SUM(bbkHp) AS hp, COUNT(*) AS buildings, SUM(cableCompleted+spliceCompleted+ibkCompleted) AS steps FROM HpBuilding').get()).toEqual({hp:15,buildings:2,steps:0});
  expect(sqlite.prepare('SELECT pstn,dsl FROM HpBuilding WHERE uavt=\'123\'').get()).toEqual({pstn:type==="BF"?3:null,dsl:type==="BF"?4:null});
  expect(sqlite.prepare('SELECT note FROM HpBuildingNote').all()).toEqual([{note:"Saha notu"}]);
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM HpBuildingHistory').get()).toEqual({n:2});
  expect(()=>save(manualProjectStatements(type,fixture(),"u"))).toThrow(/UNIQUE/);
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM HpProject').get()).toEqual({n:1});
  const invalidUser={...fixture(),projectId:"other"};
  expect(()=>save(manualProjectStatements(type,invalidUser,"missing"))).toThrow();
  expect(sqlite.prepare('SELECT COUNT(*) AS n FROM HpProject').get()).toEqual({n:1});
 }finally{sqlite.close()}
});
it("rejects missing buildings, invalid HP and duplicate buildings",()=>{
 expect(manualProjectSchema.safeParse({...fixture(),buildings:[]}).success).toBe(false);
 const input=fixture();input.buildings[0].bbkHp=-1;
 expect(manualProjectSchema.safeParse(input).success).toBe(false);
 expect(manualProjectSchema.safeParse({...fixture(),buildings:[fixture().buildings[0],fixture().buildings[0]]}).success).toBe(false);
 expect(manualProjectSchema.safeParse({...fixture(),projectId:"1,2"}).success).toBe(false);
});
