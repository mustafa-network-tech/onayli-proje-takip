import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const databasePath = path.resolve("prisma/dev.db");
if (!fs.existsSync(databasePath)) throw new Error("Yerel veritabanı bulunamadı: önce yerel kurulumu tamamlayın.");
const database = new Database(databasePath);
try {
  if (database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='HpMonthlyCompletion'").get()) {
    console.log("Aylık HP tablosu zaten mevcut; değişiklik yapılmadı.");
  } else {
    const backupDirectory = path.resolve(".cloudflare-backups");
    fs.mkdirSync(backupDirectory, { recursive: true });
    const backupPath = path.join(backupDirectory, `before-monthly-hp-${Date.now()}.db`);
    await database.backup(backupPath);
    database.transaction(() => database.exec(fs.readFileSync("migrations/0002_monthly_hp.sql", "utf8")))();
    console.log("Yerel veritabanı yedeklendi ve Aylık HP tablosu eklendi.");
  }
} finally { database.close(); }
