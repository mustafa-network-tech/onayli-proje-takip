import { Prisma } from "@prisma/client";
import { db } from "./db";
import { executeSqlBatch } from "./sql-batch";
import type { SqlCommand } from "./monthly-hp-sql";
import { parseProjectIds } from "./project-filters";
import {
  dailyAddress, istanbulDate, reportTitle, validateItemInput,
  type DailyItem, type DailyReportHead, type DailyStatus,
} from "./daily-report-shared";

export class DailyReportError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const num = (value: unknown) => (value === null || value === undefined ? null : Number(value));
const isUnique = (error: unknown) => /UNIQUE|constraint/i.test(String(error instanceof Error ? error.message : error));

type HeadRow = Record<keyof DailyReportHead, unknown>;
function head(row: HeadRow): DailyReportHead {
  return {
    id: String(row.id), status: row.status as "DRAFT" | "FINAL", reportDate: (row.reportDate as string | null) ?? null,
    sequence: num(row.sequence), title: (row.title as string | null) ?? null, totalBuildings: num(row.totalBuildings),
    completedBuildings: num(row.completedBuildings), completedHp: num(row.completedHp), problemBuildings: num(row.problemBuildings),
    problemHp: num(row.problemHp), cancelledBuildings: num(row.cancelledBuildings), cancelledHp: num(row.cancelledHp),
    finalizedAt: num(row.finalizedAt),
  };
}

const headColumns = Prisma.raw('"id","status","reportDate","sequence","title","totalBuildings","completedBuildings","completedHp","problemBuildings","problemHp","cancelledBuildings","cancelledHp","finalizedAt"');

async function itemsOf(reportId: string): Promise<DailyItem[]> {
  const rows = await db.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    SELECT "id","projectType","projectId","sourceKey","neighborhood","address","hp","status","note","createdAt"
    FROM "DailyReportItem" WHERE "reportId"=${reportId} ORDER BY "createdAt","id"`);
  return rows.map(row => ({
    id: String(row.id), projectType: row.projectType as "GF" | "BF", projectId: String(row.projectId), sourceKey: String(row.sourceKey),
    neighborhood: String(row.neighborhood ?? ""), address: String(row.address ?? ""), hp: Number(row.hp),
    status: row.status as DailyStatus, note: String(row.note ?? ""), createdAt: Number(row.createdAt),
  }));
}

export async function getDraft() {
  const rows = await db.$queryRaw<HeadRow[]>(Prisma.sql`SELECT ${headColumns} FROM "DailyReport" WHERE "status"='DRAFT' LIMIT 1`);
  if (!rows.length) return null;
  const report = head(rows[0]);
  return { report, items: await itemsOf(report.id) };
}

export async function getReport(id: string) {
  const rows = await db.$queryRaw<HeadRow[]>(Prisma.sql`SELECT ${headColumns} FROM "DailyReport" WHERE "id"=${id} LIMIT 1`);
  if (!rows.length) return null;
  return { report: head(rows[0]), items: await itemsOf(id) };
}

export async function listHistory() {
  const rows = await db.$queryRaw<HeadRow[]>(Prisma.sql`SELECT ${headColumns} FROM "DailyReport"
    WHERE "status"='FINAL' ORDER BY "reportDate" DESC,"sequence" DESC`);
  return rows.map(head);
}

export type SearchBuilding = {
  id: string; projectType: "GF" | "BF"; projectId: string; neighborhood: string; address: string; hp: number; inDraft: boolean;
};
export async function searchBuildings(projectType: "GF" | "BF", query: string): Promise<SearchBuilding[]> {
  const ids = parseProjectIds(query);
  if (!ids.length) return [];
  if (ids.length > 50) throw new DailyReportError("En fazla 50 Proje ID aranabilir.");
  const rows = await db.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    SELECT b."id",p."projectType",p."projectId",b."neighborhood",b."street",b."buildingName",b."doorNumber",b."bbkHp",
      EXISTS(SELECT 1 FROM "DailyReportItem" i JOIN "DailyReport" r ON r."id"=i."reportId" AND r."status"='DRAFT'
        WHERE i."projectType"=p."projectType" AND i."projectId"=p."projectId" AND i."sourceKey"=b."sourceKey") AS "inDraft"
    FROM "HpBuilding" b JOIN "HpProject" p ON p."id"=b."projectRefId"
    WHERE b."isActive"=1 AND p."projectType"=${projectType}
      AND p."projectId" IN (SELECT value FROM json_each(${JSON.stringify(ids)}))
    ORDER BY p."projectId",b."neighborhood",b."street",b."doorNumber" LIMIT 1000`);
  return rows.map(row => ({
    id: String(row.id), projectType: row.projectType as "GF" | "BF", projectId: String(row.projectId),
    neighborhood: String(row.neighborhood ?? ""), address: dailyAddress(row as never), hp: Number(row.bbkHp), inDraft: Number(row.inDraft) === 1,
  }));
}

export async function addItems(buildingIds: string[], statusInput: unknown, noteInput: unknown) {
  const input = validateItemInput(statusInput, noteInput);
  if ("error" in input) throw new DailyReportError(input.error);
  const unique = [...new Set(buildingIds)];
  if (!unique.length) throw new DailyReportError("Bina seçilmedi.");
  if (unique.length > 200) throw new DailyReportError("Bir defada en fazla 200 bina eklenebilir.");
  const buildings = await db.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    SELECT b."id",b."sourceKey",p."projectType",p."projectId",b."neighborhood",b."street",b."buildingName",b."doorNumber",b."bbkHp"
    FROM "HpBuilding" b JOIN "HpProject" p ON p."id"=b."projectRefId"
    WHERE b."isActive"=1 AND b."id" IN (SELECT value FROM json_each(${JSON.stringify(unique)}))`);
  if (buildings.length !== unique.length) throw new DailyReportError("Seçilen binalardan biri bulunamadı. Listeyi yenileyin.", 404);
  const existing = await db.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    SELECT i."projectType",i."projectId",i."sourceKey" FROM "DailyReportItem" i
    JOIN "DailyReport" r ON r."id"=i."reportId" AND r."status"='DRAFT'`);
  const taken = new Set(existing.map(row => `${row.projectType}|${row.projectId}|${row.sourceKey}`));
  const fresh = buildings.filter(b => !taken.has(`${b.projectType}|${b.projectId}|${b.sourceKey}`));
  if (!fresh.length) throw new DailyReportError("Seçilen binalar taslakta zaten var.", 409);
  const now = Date.now();
  const commands: SqlCommand[] = [{
    sql: `INSERT OR IGNORE INTO "DailyReport" ("id","status","createdAt","updatedAt") VALUES (?,'DRAFT',?,?)`,
    values: [crypto.randomUUID(), now, now],
  }];
  for (const b of fresh) {
    commands.push({
      sql: `INSERT INTO "DailyReportItem" ("id","reportId","projectType","projectId","sourceKey","buildingRefId","neighborhood","address","hp","status","note","createdAt","updatedAt")
        VALUES (?,(SELECT "id" FROM "DailyReport" WHERE "status"='DRAFT'),?,?,?,?,?,?,?,?,?,?,?)`,
      values: [crypto.randomUUID(), String(b.projectType), String(b.projectId), String(b.sourceKey), String(b.id),
        String(b.neighborhood ?? "").trim(), dailyAddress(b as never), Number(b.bbkHp) || 0, input.status, input.note, now, now],
    });
  }
  commands.push({ sql: `UPDATE "DailyReport" SET "updatedAt"=? WHERE "status"='DRAFT'`, values: [now] });
  try { await executeSqlBatch(commands); }
  catch (error) {
    if (isUnique(error)) throw new DailyReportError("Seçilen binalar taslakta zaten var.", 409);
    throw new DailyReportError("Binalar taslağa kaydedilemedi.", 500);
  }
  return { added: fresh.length, skipped: unique.length - fresh.length };
}

async function assertDraftItem(itemId: string) {
  const rows = await db.$queryRaw<{ status: string }[]>(Prisma.sql`
    SELECT r."status" FROM "DailyReportItem" i JOIN "DailyReport" r ON r."id"=i."reportId" WHERE i."id"=${itemId}`);
  if (!rows.length) throw new DailyReportError("Kayıt bulunamadı.", 404);
  if (rows[0].status !== "DRAFT") throw new DailyReportError("Kesinleşmiş rapor değiştirilemez.", 409);
}

export async function updateItem(itemId: string, statusInput: unknown, noteInput: unknown) {
  const input = validateItemInput(statusInput, noteInput);
  if ("error" in input) throw new DailyReportError(input.error);
  await assertDraftItem(itemId);
  const now = Date.now();
  try {
    await executeSqlBatch([
      { sql: `UPDATE "DailyReportItem" SET "status"=?,"note"=?,"updatedAt"=? WHERE "id"=?`, values: [input.status, input.note, now, itemId] },
      { sql: `UPDATE "DailyReport" SET "updatedAt"=? WHERE "id"=(SELECT "reportId" FROM "DailyReportItem" WHERE "id"=?)`, values: [now, itemId] },
    ]);
  } catch { throw new DailyReportError("Kayıt güncellenemedi.", 409); }
}

export async function deleteItem(itemId: string) {
  await assertDraftItem(itemId);
  const now = Date.now();
  try {
    await executeSqlBatch([
      { sql: `UPDATE "DailyReport" SET "updatedAt"=? WHERE "id"=(SELECT "reportId" FROM "DailyReportItem" WHERE "id"=?)`, values: [now, itemId] },
      { sql: `DELETE FROM "DailyReportItem" WHERE "id"=?`, values: [itemId] },
    ]);
  } catch { throw new DailyReportError("Kayıt silinemedi.", 409); }
}

/** The single statement behind "Rapor Al"; exported so the database rules can be tested. */
export function finalizeStatement(draftId: string, date: string, sequence: number, at: number): SqlCommand {
  const count = (condition: string) => `(SELECT COUNT(*) FROM "DailyReportItem" WHERE "reportId"=? ${condition})`;
  const hp = (condition: string) => `(SELECT COALESCE(SUM("hp"),0) FROM "DailyReportItem" WHERE "reportId"=? ${condition})`;
  const done = `AND "status"='COMPLETED'`, problem = `AND "status"='PROBLEM'`, cancelled = `AND "status"='CANCELLED'`;
  return {
    sql: `UPDATE "DailyReport" SET "status"='FINAL',"reportDate"=?,"sequence"=?,"title"=?,
      "totalBuildings"=${count("")},"completedBuildings"=${count(done)},"completedHp"=${hp(done)},
      "problemBuildings"=${count(problem)},"problemHp"=${hp(problem)},
      "cancelledBuildings"=${count(cancelled)},"cancelledHp"=${hp(cancelled)},"finalizedAt"=?,"updatedAt"=?
      WHERE "id"=? AND "status"='DRAFT' AND EXISTS(SELECT 1 FROM "DailyReportItem" WHERE "reportId"=?)`,
    values: [date, sequence, reportTitle(date, sequence), draftId, draftId, draftId, draftId, draftId, draftId, draftId, at, at, draftId, draftId],
  };
}

/**
 * Rapor Al: one atomic UPDATE turns the draft into an immutable report. The date is
 * taken on the server (Europe/Istanbul); totals are computed in the same statement
 * from the stored items. Concurrent calls are resolved by the unique indexes.
 * Excel/PDF downloads are separate: a failed download never affects the saved report.
 */
export async function finalizeDraft(now: Date = new Date()) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const drafts = await db.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT "id" FROM "DailyReport" WHERE "status"='DRAFT' LIMIT 1`);
    if (!drafts.length) throw new DailyReportError("Taslak bulunamadı. Önce bina ekleyin.", 409);
    const draftId = String(drafts[0].id);
    const date = istanbulDate(now);
    const last = await db.$queryRaw<{ last: number | bigint | null }[]>(Prisma.sql`SELECT MAX("sequence") AS "last" FROM "DailyReport" WHERE "reportDate"=${date}`);
    const sequence = last[0]?.last === null || last[0]?.last === undefined ? 0 : Number(last[0].last) + 1;
    const at = now.getTime();
    try {
      await executeSqlBatch([finalizeStatement(draftId, date, sequence, at)]);
    } catch (error) {
      if (isUnique(error) && attempt < 2) continue;
      throw new DailyReportError("Rapor kaydedilemedi. Tekrar deneyin.", 500);
    }
    const result = await getReport(draftId);
    if (result?.report.status === "FINAL") return result;
    if (result?.report.status === "DRAFT" && !result.items.length) throw new DailyReportError("Boş rapor alınamaz.", 409);
    // The draft vanished or was finalized concurrently; the loop re-reads the state.
  }
  throw new DailyReportError("Rapor alınamadı. Taslağı yenileyip tekrar deneyin.", 409);
}
