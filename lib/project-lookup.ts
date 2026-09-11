import { db } from "./db";
import { parseProjectIds } from "./project-filters";

export type ProjectLocation = { id: string; projectId: string; projectType: string };
export async function findProjectLocations(query: string) {
  const ids = parseProjectIds(query);
  if (!ids.length) return [];
  return db.$queryRaw<ProjectLocation[]>`SELECT "id","projectId","projectType" FROM "HpProject"
    WHERE "projectId" IN (SELECT value FROM json_each(${JSON.stringify(ids)}))
    UNION ALL SELECT "id","projectId",'KURUMSAL' AS "projectType" FROM "CorporateProject"
    WHERE "projectId" IN (SELECT value FROM json_each(${JSON.stringify(ids)}))`;
}
