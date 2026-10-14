const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
(async () => {
  const root = path.resolve(__dirname, '..');
  const db = new Database(process.argv[2] ?? path.join(root, 'prisma/dev.db'), { fileMustExist: true });
  try {
    const names = ['ProductionEntry', 'ProductionImport', 'Team', 'CorporateProject', 'CorporateImport', 'TaficsProject'];
    const present = names.filter(n => db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(n));
    if (!present.length) { console.log('Kaldırılacak tablo yok.'); return; }
    const backups = path.join(root, 'prisma/local-backups'); fs.mkdirSync(backups, { recursive: true });
    await db.backup(path.join(backups, `before-drop-modules-${Date.now()}.db`));
    db.exec(fs.readFileSync(path.join(root, 'migrations/0007_drop_corporate_tafics_performance.sql'), 'utf8'));
    console.log('Yedek alındı; kaldırılan tablolar:', present.join(', '));
  } finally { db.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
