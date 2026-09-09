import { db } from "./db";
import { taficsSchema, type TaficsInput, type TaficsRow } from "./tafics-shared";

export async function findTaficsProjects() {
  return db.$queryRaw<TaficsRow[]>`SELECT "id","province","projectName","projectType","underground","cable","horizontalDrilling","permissionStatus","completionStatus","description" FROM "TaficsProject" ORDER BY rowid ASC`;
}
export async function createTaficsProject(input: TaficsInput) {
  const d = taficsSchema.parse(input), id = crypto.randomUUID();
  await db.$executeRaw`INSERT INTO "TaficsProject" ("id","province","projectName","projectType","underground","cable","horizontalDrilling","permissionStatus","completionStatus","description")
    VALUES (${id},${d.province},${d.projectName},${d.projectType},${d.underground},${d.cable},${d.horizontalDrilling},${d.permissionStatus},${d.completionStatus},${d.description})`;
  return { ...d, id };
}
export async function updateTaficsProject(id: string, input: TaficsInput) {
  const d = taficsSchema.parse(input);
  return db.$executeRaw`UPDATE "TaficsProject" SET "province"=${d.province},"projectName"=${d.projectName},"projectType"=${d.projectType},
    "underground"=${d.underground},"cable"=${d.cable},"horizontalDrilling"=${d.horizontalDrilling},"permissionStatus"=${d.permissionStatus},
    "completionStatus"=${d.completionStatus},"description"=${d.description},"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${id}`;
}
export async function deleteTaficsProject(id: string) {
  return db.$executeRaw`DELETE FROM "TaficsProject" WHERE "id"=${id}`;
}
