// Applies only the additive TAFICS migration to the development database.
// Never connects to Cloudflare or modifies existing project tables.
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

async function main() {
  const root = path.resolve(__dirname, ".."), filename = path.join(root, "prisma", "dev.db");
  if (!fs.existsSync(filename)) throw new Error("Yerel prisma/dev.db bulunamadı. Önce mevcut yerel geliştirme kurulumunu tamamlayın.");
  const db = new Database(filename, { fileMustExist: true });
  try {
    if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='TaficsProject'").get()) {
      console.log("TaficsProject zaten var; değişiklik yapılmadı."); return;
    }
    const backupDirectory = path.join(root, "prisma", "local-backups");
    fs.mkdirSync(backupDirectory, { recursive: true });
    await db.backup(path.join(backupDirectory, `before-tafics-${Date.now()}.db`));
    db.transaction(() => db.exec(fs.readFileSync(path.join(root, "migrations", "0004_tafics.sql"), "utf8")))();
    console.log("Yerel yedek alındı; yalnızca TaficsProject tablosu ve indeksi eklendi.");
  } finally { db.close(); }
}
main().catch(() => { console.error("Yerel TAFICS migration tamamlanamadı. Veritabanı yolunu ve erişimi kontrol edin."); process.exitCode = 1; });
