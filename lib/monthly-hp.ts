import { Prisma } from "@prisma/client";
import { db } from "./db";
import { currentMonth, validMonth, type HpList, type HpScope, type MonthlyHpRow } from "./monthly-hp-shared";

export function reportFilters(params: { month?: string; type?: string; list?: string }) {
  const month = params.month ?? currentMonth();
  const scope = params.type ?? "ALL";
  const list = params.list ?? "completed";
  if (!validMonth(month)) throw new Error("Geçerli bir ay seçin (YYYY-AA).");
  if (!["ALL", "GF", "BF"].includes(scope)) throw new Error("Proje türü GF, BF veya GF + BF olmalıdır.");
  if (!["completed", "remaining"].includes(list)) throw new Error("Geçersiz liste seçimi.");
  return { month, scope: scope as HpScope, list: list as HpList };
}

const remainingWhere = Prisma.sql`b."isActive"=1 AND p."projectType" IN ('GF','BF')
  AND NOT (b."cableCompleted"=1 AND b."spliceCompleted"=1 AND (p."projectType"='GF' OR b."ibkCompleted"=1))`;

export function findMonthlyHpRows(filters: ReturnType<typeof reportFilters>) {
  const { scope, list, month } = filters;
  if (list === "remaining") {
    return db.$queryRaw<MonthlyHpRow[]>(Prisma.sql`
      SELECT b."id",p."projectId",p."projectType",b."sourceKey",b."uavt",b."district",b."neighborhood",
        b."street",b."buildingName",b."doorNumber",b."bbkHp" AS "hp",NULL AS "month"
      FROM "HpBuilding" b JOIN "HpProject" p ON p."id"=b."projectRefId"
      WHERE ${remainingWhere} ${scope === "ALL" ? Prisma.empty : Prisma.sql`AND p."projectType"=${scope}`}
      ORDER BY p."projectType",p."projectId",b."district",b."neighborhood",b."street",b."doorNumber"`);
  }
  return db.$queryRaw<MonthlyHpRow[]>(Prisma.sql`
    SELECT "id","projectId","projectType","sourceKey","uavt","district","neighborhood","street","buildingName","doorNumber","hp","month"
    FROM "HpMonthlyCompletion"
    WHERE "month"=${month}
      ${scope === "ALL" ? Prisma.empty : Prisma.sql`AND "projectType"=${scope}`}
    ORDER BY "projectType","projectId","district","neighborhood","street","doorNumber"`);
}

export type HpSummary = { projectType: "GF" | "BF"; month: string | null; buildings: number; hp: number };
export async function getMonthlyHpReport(filters: ReturnType<typeof reportFilters>) {
  const [rows, history, remaining] = await Promise.all([
    findMonthlyHpRows(filters),
    db.$queryRaw<HpSummary[]>`SELECT "projectType","month",COUNT(*) AS "buildings",SUM("hp") AS "hp"
      FROM "HpMonthlyCompletion" GROUP BY "month","projectType" ORDER BY "month" DESC`,
    db.$queryRaw<HpSummary[]>(Prisma.sql`SELECT p."projectType",NULL AS "month",COUNT(*) AS "buildings",SUM(b."bbkHp") AS "hp"
      FROM "HpBuilding" b JOIN "HpProject" p ON p."id"=b."projectRefId"
      WHERE ${remainingWhere} GROUP BY p."projectType"`),
  ]);
  // Prisma's native SQLite adapter can return COUNT/SUM as bigint.
  const normalize = (items: HpSummary[]) => items.map(row => ({ ...row, buildings: Number(row.buildings), hp: Number(row.hp) }));
  return { rows: rows.map(row => ({ ...row, hp: Number(row.hp) })), history: normalize(history), remaining: normalize(remaining) };
}
