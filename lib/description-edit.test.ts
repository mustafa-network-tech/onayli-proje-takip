import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), update: vi.fn() }));
vi.mock("./auth", () => ({ requireUser: mocks.auth }));
vi.mock("./db", () => ({ db: { hpBuildingNote: { updateMany: mocks.update } } }));
import { PATCH as hp } from "../app/api/buildings/[id]/description/route";
const id = "11111111-1111-4111-8111-111111111111";
const context = () => ({ params: Promise.resolve({ id }) });
const request = (body: unknown) => new Request("http://localhost/description?noteId=note-1", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ id: "operator" }); mocks.update.mockResolvedValue({ count: 1 }); });
it("updates only the selected HP building note", async () => {
  expect((await hp(request({ description: "Yeni açıklama" }), context())).status).toBe(200);
  expect(mocks.update).toHaveBeenCalledWith({ where: { id: "note-1", buildingId: id }, data: { note: "Yeni açıklama" } });
});
it("rejects unauthenticated edits", async () => {
  mocks.auth.mockRejectedValue(new Error("Oturum gerekli"));
  expect((await hp(request({ description: "x" }), context())).status).toBe(401);
  expect(mocks.update).not.toHaveBeenCalled();
});
it("rejects oversized descriptions and unrelated fields", async () => {
  for (const body of [{ description: "x".repeat(30001) }, { description: "x", cable: 10 }]) {
    expect((await hp(request(body), context())).status).toBe(400);
  }
  expect(mocks.update).not.toHaveBeenCalled();
});
it("returns not found when the selected record no longer exists", async () => {
  mocks.update.mockResolvedValue({ count: 0 });
  expect((await hp(request({ description: "x" }), context())).status).toBe(404);
});
