const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
(async () => {
  const root = path.resolve(__dirname, '..');
  const dbPath = process.argv[2] ?? path.join(root, 'prisma/dev.db');
  const db = new Database(dbPath, { fileMustExist: true });
  try {
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='DailyReport'").get()) { console.log('Günlük rapor tabloları zaten var.'); return; }
    const backups = path.join(root, 'prisma/local-backups'); fs.mkdirSync(backups, { recursive: true });
    await db.backup(path.join(backups, `before-daily-reports-${Date.now()}.db`));
    db.exec(fs.readFileSync(path.join(root, 'migrations/0006_daily_reports.sql'), 'utf8'));
    console.log('Yedek alındı; günlük rapor tabloları eklendi.');
  } finally { db.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
