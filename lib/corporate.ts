import { z } from "zod";
import { db } from "./db";
import { executeSqlBatch } from "./sql-batch";
import { filterCorporateProjects, type CorporatePreview, type CorporateProjectRow, type CorporateSource } from "./corporate-shared";
import { parseCorporateWorkbook } from "./corporate-excel";
import type { SqlCommand } from "./monthly-hp-sql";

const nullableText = z.string().max(2000).nullable();
export const corporateCreateSchema = z.object({
  projectId: z.string().trim().min(1, "ID gerekli.").max(100),
  district: z.string().trim().min(1, "İlçe gerekli.").max(200),
  address: z.string().trim().min(1, "Adres gerekli.").max(2000),
  note: z.string().trim().max(2000).default(""),
}).strict();

export async function createCorporateProject(input: z.infer<typeof corporateCreateSchema>) {
  const data = corporateCreateSchema.parse(input);
  const id = crypto.randomUUID();
  const count = await db.$executeRaw`INSERT INTO "CorporateProject"
    ("id","projectId","district","address","note","districtEdited","addressEdited")
    VALUES (${id},${data.projectId},${data.district},${data.address},${data.note},1,1)
    ON CONFLICT("projectId") DO NOTHING`;
  return count ? id : null;
}

export const corporateCommitSchema = z.object({ fileName: z.string().min(1).max(255), rows: z.array(z.object({
  projectId: z.string().trim().min(1).max(100), district: nullableText, address: nullableText,
  centralName: nullableText, drawingName: nullableText, projectFeature: nullableText, approvalStatus: nullableText,
  rowNumber: z.number().int().positive(),
})).min(1).max(10000) }).superRefine((input, ctx) => {
  if (new Set(input.rows.map(row => row.projectId)).size !== input.rows.length) ctx.addIssue({ code: "custom", message: "Aynı Proje ID birden fazla kez gönderilemez." });
});

export async function previewCorporateImport(buffer: Buffer, fileName: string): Promise<CorporatePreview> {
  const parsed = parseCorporateWorkbook(buffer);
  const existing = await db.$queryRaw<{ projectId: string }[]>`SELECT "projectId" FROM "CorporateProject"`;
  const ids = new Set(existing.map(row => row.projectId));
  const existingProjects = parsed.rows.filter(row => ids.has(row.projectId)).length;
  return { ...parsed, fileName, existingProjects, newProjects: parsed.rows.length - existingProjects };
}

export function corporateImportCommands(rows: CorporateSource[], fileName: string, userId: string, importId: string): SqlCommand[] {
  return [
    { sql: 'INSERT INTO "CorporateImport" ("id","fileName","totalRows","importedBy") VALUES (?,?,?,?)', values: [importId, fileName, rows.length, userId] },
    ...rows.map(row => ({ sql: `INSERT INTO "CorporateProject"
      ("id","projectId","district","address","centralName","drawingName","projectFeature","approvalStatus","lastImportId") VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT("projectId") DO UPDATE SET
        "centralName"=excluded."centralName","drawingName"=excluded."drawingName",
        "projectFeature"=excluded."projectFeature","approvalStatus"=excluded."approvalStatus",
        "district"=CASE WHEN "CorporateProject"."districtEdited"=0 THEN excluded."district" ELSE "CorporateProject"."district" END,
        "address"=CASE WHEN "CorporateProject"."addressEdited"=0 THEN excluded."address" ELSE "CorporateProject"."address" END,
        "lastImportId"=excluded."lastImportId","updatedAt"=CURRENT_TIMESTAMP`,
      values: [crypto.randomUUID(), row.projectId, row.district, row.address, row.centralName, row.drawingName, row.projectFeature, row.approvalStatus, importId],
    })),
  ];
}

export async function commitCorporateImport(input: z.infer<typeof corporateCommitSchema>, userId: string) {
  const id = crypto.randomUUID();
  await executeSqlBatch(corporateImportCommands(input.rows, input.fileName, userId, id));
  return id;
}

export const corporateFilterSchema = z.object({ district: z.string().max(200).optional(), q: z.string().max(200).optional(), status: z.enum(["all", "completed", "ongoing", "not_started"]).default("all") });
export type CorporateFilters = z.infer<typeof corporateFilterSchema>;
export async function findCorporateProjects(filters: CorporateFilters) {
  const rows = await db.$queryRaw<CorporateProjectRow[]>`SELECT "id","projectId","district","address","cableCompleted","spliceCompleted","note" FROM "CorporateProject" ORDER BY "district","projectId"`;
  return filterCorporateProjects(rows.map(row => ({ ...row, cableCompleted: Boolean(row.cableCompleted), spliceCompleted: Boolean(row.spliceCompleted) })), filters);
}
