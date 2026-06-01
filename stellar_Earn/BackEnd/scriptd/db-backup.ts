import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set in environment');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(__dirname, '../backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
const command = `pg_dump ${DATABASE_URL} -f ${backupFile}`;

console.log(`Creating backup at ${backupFile}...`);

exec(command, (err, stdout, stderr) => {
  if (err) {
    console.error('Backup failed:', err);
    process.exit(1);
  }
  console.log('Backup completed successfully.');
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
});
