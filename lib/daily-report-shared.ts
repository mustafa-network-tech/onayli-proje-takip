export type DailyStatus = "COMPLETED" | "PROBLEM" | "CANCELLED";
export const DAILY_STATUSES: DailyStatus[] = ["COMPLETED", "PROBLEM", "CANCELLED"];
export const NOTE_MAX = 1000;
export const statusLabel: Record<DailyStatus, string> = { COMPLETED: "Tamamlandı", PROBLEM: "Problemli", CANCELLED: "İptal" };
export const sectionTitle: Record<DailyStatus, string> = { COMPLETED: "TAMAMLANAN BİNALAR", PROBLEM: "PROBLEMLİ BİNALAR", CANCELLED: "İPTAL EDİLEN BİNALAR" };
// Row fills (hex without #): completed white, problem light blue, cancelled light red.
export const statusFill: Record<DailyStatus, string> = { COMPLETED: "FFFFFF", PROBLEM: "DDEBF7", CANCELLED: "FFC7CE" };

export type DailyItem = {
  id: string; projectType: "GF" | "BF"; projectId: string; sourceKey: string;
  neighborhood: string; address: string; hp: number; status: DailyStatus; note: string; createdAt?: number;
};
export type DailyReportHead = {
  id: string; status: "DRAFT" | "FINAL"; reportDate: string | null; sequence: number | null; title: string | null;
  totalBuildings: number | null; completedBuildings: number | null; completedHp: number | null;
  problemBuildings: number | null; problemHp: number | null; cancelledBuildings: number | null; cancelledHp: number | null;
  finalizedAt: number | null;
};

/** Address without district/neighborhood; the neighborhood has its own column. */
export function dailyAddress(row: { street?: string | null; buildingName?: string | null; doorNumber?: string | null }) {
  return [row.street, row.buildingName, row.doorNumber ? `No: ${row.doorNumber}` : null]
    .map(value => (value ?? "").trim()).filter(Boolean).join(" / ") || "Adres belirtilmemiş";
}

export function noteRequired(status: DailyStatus) { return status !== "COMPLETED"; }

export function validateItemInput(status: unknown, note: unknown): { status: DailyStatus; note: string } | { error: string } {
  if (typeof status !== "string" || !DAILY_STATUSES.includes(status as DailyStatus)) return { error: "Geçersiz durum." };
  const text = typeof note === "string" ? note.trim() : "";
  if (text.length > NOTE_MAX) return { error: `Açıklama en fazla ${NOTE_MAX} karakter olabilir.` };
  if (noteRequired(status as DailyStatus) && !text) return { error: "Problemli ve iptal edilen binalarda açıklama zorunludur." };
  return { status: status as DailyStatus, note: text };
}

export type Totals = {
  totalBuildings: number; completedBuildings: number; completedHp: number;
  problemBuildings: number; problemHp: number; cancelledBuildings: number; cancelledHp: number;
};
/** Toplam HP counts only completed buildings; problem and cancelled HP are reported separately. */
export function computeTotals(items: Pick<DailyItem, "status" | "hp">[]): Totals {
  const totals: Totals = { totalBuildings: items.length, completedBuildings: 0, completedHp: 0, problemBuildings: 0, problemHp: 0, cancelledBuildings: 0, cancelledHp: 0 };
  for (const item of items) {
    const hp = Number(item.hp) || 0;
    if (item.status === "COMPLETED") { totals.completedBuildings++; totals.completedHp += hp; }
    else if (item.status === "PROBLEM") { totals.problemBuildings++; totals.problemHp += hp; }
    else { totals.cancelledBuildings++; totals.cancelledHp += hp; }
  }
  return totals;
}

const collator = new Intl.Collator("tr-TR", { numeric: true, sensitivity: "base" });
export function sortItems<T extends Pick<DailyItem, "projectId" | "neighborhood" | "address">>(items: T[]): T[] {
  return [...items].sort((a, b) => collator.compare(a.projectId, b.projectId) || collator.compare(a.neighborhood, b.neighborhood) || collator.compare(a.address, b.address));
}
export function sections<T extends Pick<DailyItem, "status" | "projectId" | "neighborhood" | "address">>(items: T[]) {
  return DAILY_STATUSES.map(status => ({ status, title: sectionTitle[status], items: sortItems(items.filter(item => item.status === status)) }));
}

export function istanbulDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export const displayDate = (iso: string) => iso.split("-").reverse().join(".");
export const fileDate = (iso: string) => iso.split("-").reverse().join("-");
/** First report of a day has no suffix; the next ones are "(1)", "(2)"... */
export const sequenceSuffix = (sequence: number) => (sequence > 0 ? ` (${sequence})` : "");
export const reportTitle = (isoDate: string, sequence: number) => `${displayDate(isoDate)} Günlük Rapor${sequenceSuffix(sequence)}`;
export const reportFileBase = (isoDate: string, sequence: number) => `Bina_Raporu_${fileDate(isoDate)}${sequence > 0 ? `_(${sequence})` : ""}`;
export const formatHp = (value: number) => Number(value).toLocaleString("tr-TR");
