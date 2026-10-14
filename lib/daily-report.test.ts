import { describe, expect, it } from "vitest";
import { computeTotals, dailyAddress, istanbulDate, reportFileBase, reportTitle, sections, validateItemInput } from "./daily-report-shared";

describe("daily report rules", () => {
  it("builds the address without district or neighborhood", () => {
    expect(dailyAddress({ street: "Atatürk Cd.", buildingName: "Yıldız Sitesi", doorNumber: "12" })).toBe("Atatürk Cd. / Yıldız Sitesi / No: 12");
    expect(dailyAddress({})).toBe("Adres belirtilmemiş");
  });
  it("requires a note for problem and cancelled buildings", () => {
    expect(validateItemInput("PROBLEM", "  ")).toHaveProperty("error");
    expect(validateItemInput("CANCELLED", "")).toHaveProperty("error");
    expect(validateItemInput("COMPLETED", "")).toEqual({ status: "COMPLETED", note: "" });
    expect(validateItemInput("PROBLEM", " kablo yok ")).toEqual({ status: "PROBLEM", note: "kablo yok" });
    expect(validateItemInput("X", "")).toHaveProperty("error");
    expect(validateItemInput("PROBLEM", "a".repeat(1001))).toHaveProperty("error");
  });
  it("totals: Toplam HP is completed only", () => {
    const totals = computeTotals([
      { status: "COMPLETED", hp: 10 }, { status: "COMPLETED", hp: 5 },
      { status: "PROBLEM", hp: 7 }, { status: "CANCELLED", hp: 3 },
    ]);
    expect(totals).toEqual({ totalBuildings: 4, completedBuildings: 2, completedHp: 15, problemBuildings: 1, problemHp: 7, cancelledBuildings: 1, cancelledHp: 3 });
  });
  it("splits into three ordered sections", () => {
    const result = sections([
      { status: "PROBLEM", projectId: "2", neighborhood: "B", address: "x" },
      { status: "COMPLETED", projectId: "10", neighborhood: "A", address: "x" },
      { status: "COMPLETED", projectId: "9", neighborhood: "A", address: "x" },
    ]);
    expect(result.map(s => s.status)).toEqual(["COMPLETED", "PROBLEM", "CANCELLED"]);
    expect(result[0].items.map(i => i.projectId)).toEqual(["9", "10"]);
    expect(result[2].items).toEqual([]);
  });
  it("names the report and file, with a suffix for same-day repeats", () => {
    expect(reportTitle("2026-10-10", 0)).toBe("10.10.2026 Günlük Rapor");
    expect(reportTitle("2026-10-10", 1)).toBe("10.10.2026 Günlük Rapor (1)");
    expect(reportFileBase("2026-10-14", 0)).toBe("Bina_Raporu_14-10-2026");
    expect(reportFileBase("2026-10-14", 2)).toBe("Bina_Raporu_14-10-2026_(2)");
  });
  it("uses the Istanbul calendar day", () => {
    expect(istanbulDate(new Date("2026-10-13T21:30:00Z"))).toBe("2026-10-14");
    expect(istanbulDate(new Date("2026-10-13T20:30:00Z"))).toBe("2026-10-13");
  });
});
