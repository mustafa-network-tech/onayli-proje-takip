import {Prisma} from "@prisma/client";
import {db} from "@/lib/db";

export type ExportBuilding={
 projectId:string;centralName:string|null;district:string|null;neighborhood:string|null;
 street:string|null;doorNumber:string|null;uavt:string|null;bbkHp:number;pstn:number|null;
 dsl:number|null;cableCompleted:number|boolean;spliceCompleted:number|boolean;
 obkCompleted:number|boolean;description:string|null;
};

// Relation includes become `IN (?, ?, ...)` queries. Large exports can exceed
// D1's SQLite variable limit, while this join always uses at most four bindings.
export function findExportBuildings(projectType:"GF"|"BF",filters:{district?:string;id?:string;year?:string}){
 const {district,id,year}=filters;
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
    ${id?Prisma.sql`AND p."projectId" LIKE ${`%${id}%`}`:Prisma.empty}
    ${year?Prisma.sql`AND p."projectYear"=${Number(year)}`:Prisma.empty}
  ORDER BY p."projectId", b."district", b."neighborhood", b."street", b."doorNumber"
 `);
}
