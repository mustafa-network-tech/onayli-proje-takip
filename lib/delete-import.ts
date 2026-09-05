import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "./db";

// A single parameter avoids variable limits even for large Excel imports.
export const importDeletionSql = [
  'SELECT COUNT(*) AS count FROM "HpExcelImport" WHERE "id" = ?',
  'SELECT COUNT(*) AS count FROM "HpProject" WHERE "lastImportId" = ?',
  'SELECT COUNT(*) AS count FROM "HpBuilding" WHERE "projectRefId" IN (SELECT "id" FROM "HpProject" WHERE "lastImportId" = ?)',
  'DELETE FROM "HpProject" WHERE "lastImportId" = ?',
  'DELETE FROM "HpExcelImport" WHERE "id" = ?',
] as const;

export async function deleteExcelImport(id: string) {
  let counts: number[];
  if (process.env.NODE_ENV === "development") {
    counts = await db.$transaction(async (tx) => {
      const values: number[] = [];
      for (const sql of importDeletionSql.slice(0, 3)) {
        const rows = await tx.$queryRawUnsafe<{ count: number | bigint }[]>(sql, id);
        values.push(Number(rows[0].count));
      }
      for (const sql of importDeletionSql.slice(3)) await tx.$executeRawUnsafe(sql, id);
      return values;
    });
  } else {
    const { env } = getCloudflareContext();
    // D1 batch rolls back the entire operation if any statement fails.
    const results = await env.DB.batch<{ count: number }>(
      importDeletionSql.map((sql) => env.DB.prepare(sql).bind(id)),
    );
    counts = results.slice(0, 3).map((result: { results: { count: number }[] }) => Number(result.results[0].count));
  }
  return counts[0] ? { projects: counts[1], buildings: counts[2] } : null;
}
