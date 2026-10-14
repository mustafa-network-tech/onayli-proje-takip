import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({}) }));
vi.mock("./db", () => ({ db: {} }));
import { finalizeStatement } from "./daily-report";

let db: Database.Database;
const now = 1_700_000_000_000;
beforeEach(() => {
  db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(path.resolve(__dirname, "../migrations/0006_daily_reports.sql"), "utf8"));
});
const draft = (id: string) => db.prepare(`INSERT INTO DailyReport (id,status,createdAt,updatedAt) VALUES (?, 'DRAFT', ?, ?)`).run(id, now, now);
const item = (id: string, report: string, key: string, status = "COMPLETED", note = "", hp = 10, type = "GF") =>
  db.prepare(`INSERT INTO DailyReportItem (id,reportId,projectType,projectId,sourceKey,neighborhood,address,hp,status,note,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, report, type, "P1", key, "Mah", "Adres", hp, status, note, now, now);
const finalize = (id: string, date: string, seq: number) => {
  const c = finalizeStatement(id, date, seq, now);
  return db.prepare(c.sql).run(...c.values);
};

describe("daily report database rules", () => {
  it("allows only one draft", () => {
    draft("a");
    expect(() => draft("b")).toThrow(/UNIQUE/);
    expect(db.prepare(`INSERT OR IGNORE INTO DailyReport (id,status,createdAt,updatedAt) VALUES ('c','DRAFT',1,1)`).run().changes).toBe(0);
  });
  it("rejects the same building twice in one draft but allows it in another report", () => {
    draft("a"); item("1", "a", "U:1");
    expect(() => item("2", "a", "U:1")).toThrow(/UNIQUE/);
    item("3", "a", "U:1", "COMPLETED", "", 10, "BF"); // other project type is a different building
    finalize("a", "2026-10-14", 0);
    draft("b");
    expect(() => item("4", "b", "U:1")).not.toThrow();
  });
  it("requires a note for problem and cancelled items", () => {
    draft("a");
    expect(() => item("1", "a", "U:1", "PROBLEM", "  ")).toThrow(/CHECK/);
    expect(() => item("2", "a", "U:2", "CANCELLED", "")).toThrow(/CHECK/);
    expect(() => item("3", "a", "U:3", "PROBLEM", "sorun")).not.toThrow();
  });
  it("finalizes atomically with totals and refuses empty drafts", () => {
    draft("a");
    expect(finalize("a", "2026-10-14", 0).changes).toBe(0);
    item("1", "a", "U:1", "COMPLETED", "", 10); item("2", "a", "U:2", "COMPLETED", "", 5);
    item("3", "a", "U:3", "PROBLEM", "x", 7); item("4", "a", "U:4", "CANCELLED", "y", 3);
    expect(finalize("a", "2026-10-14", 0).changes).toBe(1);
    expect(db.prepare(`SELECT * FROM DailyReport WHERE id='a'`).get()).toMatchObject({
      status: "FINAL", reportDate: "2026-10-14", sequence: 0, title: "14.10.2026 Günlük Rapor",
      totalBuildings: 4, completedBuildings: 2, completedHp: 15, problemBuildings: 1, problemHp: 7, cancelledBuildings: 1, cancelledHp: 3,
    });
  });
  it("numbers same-day reports and rejects duplicate sequence", () => {
    draft("a"); item("1", "a", "U:1"); finalize("a", "2026-10-10", 0);
    draft("b"); item("2", "b", "U:1"); finalize("b", "2026-10-10", 1);
    expect(db.prepare(`SELECT title FROM DailyReport WHERE id='b'`).get()).toEqual({ title: "10.10.2026 Günlük Rapor (1)" });
    draft("c"); item("3", "c", "U:1");
    expect(() => finalize("c", "2026-10-10", 1)).toThrow(/UNIQUE/);
  });
  it("makes finalized reports and their items immutable", () => {
    draft("a"); item("1", "a", "U:1", "PROBLEM", "not"); finalize("a", "2026-10-14", 0);
    expect(() => db.prepare(`UPDATE DailyReport SET title='x' WHERE id='a'`).run()).toThrow(/değiştirilemez/);
    expect(() => db.prepare(`DELETE FROM DailyReport WHERE id='a'`).run()).toThrow(/silinemez/);
    expect(() => db.prepare(`UPDATE DailyReportItem SET status='COMPLETED' WHERE id='1'`).run()).toThrow(/değiştirilemez/);
    expect(() => db.prepare(`DELETE FROM DailyReportItem WHERE id='1'`).run()).toThrow(/değiştirilemez/);
    expect(() => item("2", "a", "U:2")).toThrow(/eklenemez/);
    expect(() => db.prepare(`UPDATE DailyReport SET status='DRAFT',reportDate=NULL WHERE id='a'`).run()).toThrow();
  });
  it("keeps the snapshot independent of source building tables", () => {
    db.exec(`CREATE TABLE HpBuilding (id TEXT PRIMARY KEY, bbkHp INTEGER)`);
    db.prepare(`INSERT INTO HpBuilding VALUES ('b1', 10)`).run();
    draft("a"); item("1", "a", "U:1", "COMPLETED", "", 10); finalize("a", "2026-10-14", 0);
    db.prepare(`DELETE FROM HpBuilding`).run();
    expect(db.prepare(`SELECT hp FROM DailyReportItem WHERE id='1'`).get()).toEqual({ hp: 10 });
  });
});
