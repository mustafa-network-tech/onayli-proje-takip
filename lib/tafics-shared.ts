import { z } from "zod";

export const permissionStatuses = ["ALINDI", "DEVAM EDİYOR", "ALINMADI"] as const;
export const completionStatuses = ["TAMAMLANDI", "DEVAM EDİYOR", "BAŞLAMADI"] as const;
export const taficsHeaders = ["S.N.", "İL", "PROJE ADI", "PROJE TÜRÜ", "YERALTI", "KABLO", "YATAY SONDAJ", "İZİN DURUMU", "TAMAMLANMA DURUMU", "AÇIKLAMA"];
const measurement = z.number().finite().min(0, "Metraj negatif olamaz.").max(1e12, "Metraj çok büyük.");
export const taficsSchema = z.object({
  province: z.string().trim().min(1, "İl gerekli.").max(200),
  projectName: z.string().trim().min(1, "Proje Adı gerekli.").max(1000),
  projectType: z.string().trim().max(200).default("TAFICS"),
  underground: measurement, cable: measurement, horizontalDrilling: measurement,
  permissionStatus: z.enum(permissionStatuses), completionStatus: z.enum(completionStatuses),
  description: z.string().max(30000, "Açıklama en fazla 30.000 karakter olabilir.").default(""),
}).strict();
export type TaficsInput = z.infer<typeof taficsSchema>;
export type TaficsRow = TaficsInput & { id: string };
export const taficsFilterSchema = z.object({
  q: z.string().max(1000).default(""), province: z.string().max(200).default(""),
  projectType: z.string().max(200).default(""),
  permissionStatus: z.union([z.literal(""), z.enum(permissionStatuses)]).default(""),
  completionStatus: z.union([z.literal(""), z.enum(completionStatuses)]).default(""),
});
export type TaficsFilters = z.infer<typeof taficsFilterSchema>;
export const emptyTaficsFilters = taficsFilterSchema.parse({});
export function filterTaficsProjects(rows: TaficsRow[], filters: TaficsFilters) {
  const search = filters.q.trim().toLocaleLowerCase("tr-TR");
  return rows.filter(row => (!search || `${row.projectName} ${row.province}`.toLocaleLowerCase("tr-TR").includes(search))
    && (!filters.province || row.province === filters.province)
    && (!filters.projectType || row.projectType === filters.projectType)
    && (!filters.permissionStatus || row.permissionStatus === filters.permissionStatus)
    && (!filters.completionStatus || row.completionStatus === filters.completionStatus));
}
export function taficsTotals(rows: TaficsRow[]) {
  return rows.reduce((sum, row) => ({ underground: sum.underground + row.underground, cable: sum.cable + row.cable,
    horizontalDrilling: sum.horizontalDrilling + row.horizontalDrilling }), { underground: 0, cable: 0, horizontalDrilling: 0 });
}
