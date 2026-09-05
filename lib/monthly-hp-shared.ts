export type HpScope = "ALL" | "GF" | "BF";
export type HpList = "completed" | "remaining";
export type MonthlyHpRow = {
  id: string; projectId: string; projectType: "GF" | "BF"; sourceKey: string;
  uavt: string | null; district: string | null; neighborhood: string | null;
  street: string | null; buildingName: string | null; doorNumber: string | null;
  hp: number; month: string | null;
};
export function currentMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}`;
}
export function validMonth(value: string) { return /^(20\d{2})-(0[1-9]|1[0-2])$/.test(value); }
export function monthLabel(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T00:00:00Z`));
}
export function buildingAddress(row: Pick<MonthlyHpRow, "district" | "neighborhood" | "street" | "buildingName" | "doorNumber">) {
  return [row.district, row.neighborhood, row.street, row.buildingName, row.doorNumber ? `No: ${row.doorNumber}` : null].filter(Boolean).join(" / ") || "Adres belirtilmemiş";
}
export function hpTotals(rows: Pick<MonthlyHpRow, "projectType" | "hp">[]) {
  const totals = { GF: { buildings: 0, hp: 0 }, BF: { buildings: 0, hp: 0 }, ALL: { buildings: 0, hp: 0 } };
  for (const row of rows) {
    totals[row.projectType].buildings++; totals[row.projectType].hp += Number(row.hp);
    totals.ALL.buildings++; totals.ALL.hp += Number(row.hp);
  }
  return totals;
}
