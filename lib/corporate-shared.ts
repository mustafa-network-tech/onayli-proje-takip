export type CorporateStatus = "all" | "completed" | "ongoing" | "not_started";
export type CorporateFilters = { district?: string[]; q?: string; status: CorporateStatus };
export type CorporateSource = {
  projectId: string; district: string | null; address: string | null;
  centralName: string | null; drawingName: string | null;
  projectFeature: string | null; approvalStatus: string | null; rowNumber: number;
};
export type CorporateProjectRow = Pick<CorporateSource, "projectId" | "district" | "address"> & {
  id: string; cableCompleted: boolean; spliceCompleted: boolean; note: string;
};
export type CorporatePreview = {
  fileName: string; totalRows: number; rows: CorporateSource[];
  errors: { row: number; message: string }[]; newProjects: number; existingProjects: number;
};
export function corporateStatus(row: { cableCompleted: boolean; spliceCompleted: boolean }) {
  if (row.cableCompleted && row.spliceCompleted) return { key: "completed", label: "Tamamlandı" } as const;
  if (row.cableCompleted || row.spliceCompleted) return { key: "ongoing", label: "Devam Ediyor" } as const;
  return { key: "not_started", label: "Başlanmadı" } as const;
}

export function filterCorporateProjects(rows: CorporateProjectRow[], filters: CorporateFilters) {
  const search = filters.q?.trim().toLocaleLowerCase("tr-TR") ?? "";
  const districts = new Set(filters.district);
  return rows.filter(row => (!districts.size || (row.district !== null && districts.has(row.district)))
    && (!search || `${row.projectId} ${row.address ?? ""}`.toLocaleLowerCase("tr-TR").includes(search))
    && (filters.status === "all" || corporateStatus(row).key === filters.status));
}
