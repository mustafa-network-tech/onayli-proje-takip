// Local HTTP integration check; creates and removes only its own TAFICS fixture.
const assert = require("node:assert/strict");
const XLSX = require("xlsx");
require("@next/env").loadEnvConfig(process.cwd(), true);
const base = "http://localhost:3100";
async function main() {
  assert.equal((await fetch(`${base}/api/tafics/export`)).status, 401);
  const login = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: process.env.APP_PASSWORD }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const headers = { cookie, "content-type": "application/json" };
  const name = `TAFICS test ${crypto.randomUUID()}`;
  const input = { province: "ÇANAKKALE", projectName: name, projectType: "TAFICS", underground: 6500.25, cable: 7000, horizontalDrilling: 400,
    permissionStatus: "ALINMADI", completionStatus: "BAŞLAMADI", description: "Yerel doğrulama\nİkinci satır" };
  let id;
  try {
    const created = await fetch(`${base}/api/tafics`, { method: "POST", headers, body: JSON.stringify(input) });
    assert.equal(created.status, 201); id = (await created.json()).project.id;
    const page = await fetch(`${base}/tafics`, { headers });
    assert.equal(page.status, 200); const html = await page.text();
    assert.ok(html.includes(name)); assert.ok(html.includes("Yeni TAFICS Projesi"));
    const updated = await fetch(`${base}/api/tafics/${id}`, { method: "PATCH", headers, body: JSON.stringify({ ...input, projectName: `${name} güncel`, permissionStatus: "ALINDI", completionStatus: "TAMAMLANDI" }) });
    assert.equal(updated.status, 200);
    const exported = await fetch(`${base}/api/tafics/export?${new URLSearchParams({ q: name, permissionStatus: "ALINDI" })}`, { headers });
    assert.equal(exported.status, 200);
    const sheet = XLSX.read(await exported.arrayBuffer()).Sheets.TAFICS;
    assert.equal(sheet["!ref"], "A1:I3"); assert.equal(sheet.D2.t, "n"); assert.equal(sheet.D3.v, 6500.25);
    for (const route of ["/", "/corporate", "/projects/GF", "/monthly-hp"]) {
      assert.equal((await fetch(`${base}${route}`, { headers })).status, 200, route);
    }
    console.log("PASS: oturum, TAFICS ekranı, oluşturma, düzenleme, filtreli Excel ve mevcut dört ekran.");
  } finally {
    if (id) {
      const deleted = await fetch(`${base}/api/tafics/${id}`, { method: "DELETE", headers, body: JSON.stringify({ confirmed: true }) });
      assert.equal(deleted.status, 200); console.log("PASS: yalnızca test kaydı silindi.");
    }
  }
}
main().catch(() => { console.error("Yerel HTTP testi başarısız. Yerel sunucu, veritabanı ve oturum ayarlarını kontrol edin."); process.exitCode = 1; });
