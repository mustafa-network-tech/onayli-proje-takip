import {parseProjectIds} from "@/lib/project-filters";
import {Prisma} from "@prisma/client";
import {db} from "@/lib/db";

export type ExportBuilding={
 projectId:string;centralName:string|null;district:string|null;neighborhood:string|null;
 street:string|null;doorNumber:string|null;uavt:string|null;bbkHp:number;pstn:number|null;
 dsl:number|null;cableCompleted:number|boolean;spliceCompleted:number|boolean;
 obkCompleted:number|boolean;description:string|null;
};

// Relation includes become `IN (?, ?, ...)` queries. Large exports can exceed
// D1's SQLite variable limit. The JSON ID list uses a single binding.
export function findExportBuildings(projectType:"GF"|"BF",filters:{district?:string;id?:string;year?:string}){
 const {district,id,year}=filters;
 const ids=parseProjectIds(id);
 return db.$queryRaw<ExportBuilding[]>(Prisma.sql`
  SELECT p."projectId", p."centralName", b."district", b."neighborhood",
         b."street", b."doorNumber", b."uavt", b."bbkHp", b."pstn", b."dsl",
         b."cableCompleted", b."spliceCompleted", b."ibkCompleted" AS "obkCompleted",
         COALESCE((
           SELECT group_concat(n."note", ' | ')
           FROM (SELECT "note" FROM "HpBuildingNote" WHERE "buildingId"=b."id" ORDER BY "createdAt" DESC) n
         ), '') AS "description"
  FROM "HpBuilding" b
  JOIN "HpProject" p ON p."id"=b."projectRefId"
  WHERE b."isActive"=1 AND p."projectType"=${projectType}
    ${district?Prisma.sql`AND b."district"=${district}`:Prisma.empty}
    ${ids.length?Prisma.sql`AND p."projectId" IN (SELECT value FROM json_each(${JSON.stringify(ids)}))`:Prisma.empty}
    ${year?Prisma.sql`AND p."projectYear"=${Number(year)}`:Prisma.empty}
  ORDER BY p."projectId",
    CASE WHEN b."cableCompleted"=1 AND b."spliceCompleted"=1 AND (p."projectType"='GF' OR b."ibkCompleted"=1) THEN 1 ELSE 0 END, b."district", b."neighborhood", b."street", b."doorNumber"
 `);
}
