const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
(async () => {
  const root = path.resolve(__dirname, '..');
  const db = new Database(path.join(root, 'prisma/dev.db'), { fileMustExist: true });
  try {
    if (db.prepare('PRAGMA table_info("HpBuilding")').all().some(c => c.name === 'isCancelled')) { console.log('İptal alanı zaten var.'); return; }
    const backups = path.join(root, 'prisma/local-backups'); fs.mkdirSync(backups, { recursive: true });
    await db.backup(path.join(backups, `before-cancellation-${Date.now()}.db`));
    db.transaction(() => db.exec(fs.readFileSync(path.join(root, 'migrations/0005_building_cancelled.sql'), 'utf8')))();
    console.log('Yedek alındı; yerel veritabanına iptal alanı eklendi.');
  } finally { db.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
