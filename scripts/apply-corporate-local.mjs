import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const databasePath = path.resolve("prisma/dev.db");
if (!fs.existsSync(databasePath)) throw new Error("Yerel veritabanı bulunamadı.");
const database = new Database(databasePath);
try {
  if (database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='CorporateProject'").get()) {
    console.log("Kurumsal tabloları zaten mevcut; değişiklik yapılmadı.");
  } else {
    fs.mkdirSync(".cloudflare-backups", { recursive: true });
    await database.backup(path.resolve(`.cloudflare-backups/before-corporate-${Date.now()}.db`));
    database.transaction(() => database.exec(fs.readFileSync("migrations/0003_corporate.sql", "utf8")))();
    console.log("Yerel veritabanı yedeklendi ve Kurumsal tabloları eklendi.");
  }
} finally { database.close(); }
