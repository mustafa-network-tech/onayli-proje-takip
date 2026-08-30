export type ProjectType = "GF" | "BF";
export type ParsedBuilding = {
  projectId: string; centralName: string | null; projectYear: number | null;
  uavt: string | null; district: string | null; neighborhood: string | null;
  street: string | null; buildingName: string | null; doorNumber: string | null;
  bbkHp: number; pstn: number | null; dsl: number | null; infrastructureStatus: string | null;
  workProgressDate: Date | null; rekorDate: Date | null; equivalentBuildingCode: string | null; csbmCode: string | null;
  sourceKey: string; rowNumber: number; excelCompleted: boolean;
};
export type ProjectImportDecision = { projectId: string; accepted: boolean; action: "CREATE" | "REPLACE" | "KEEP_EXISTING"; rowCount: number; reason: string };
export type ImportPreview = { fileName: string; projectType: ProjectType; totalRows: number; projectCount: number; buildingCount: number; acceptedProjects: number; rejectedProjects: number; acceptedRows: number; rejectedRows: number; newProjects: number; replacedProjects: number; existingProjects: number; newBuildings: number; updatedBuildings: number; unchangedBuildings: number; archivedBuildings: number; decisions: ProjectImportDecision[]; errors: { row: number; message: string }[]; rows: ParsedBuilding[] };
