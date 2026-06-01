import { exec } from 'child_process';
import * as path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;
const backupFile = process.argv[2]; // pass the file path as argument

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set in environment');
  process.exit(1);
}

if (!backupFile) {
  console.error('Please provide the path to the backup file.');
  process.exit(1);
}

const resolvedFile = path.resolve(backupFile);
const command = `psql ${DATABASE_URL} -f ${resolvedFile}`;

console.log(`Restoring database from ${resolvedFile}...`);

exec(command, (err, stdout, stderr) => {
  if (err) {
    console.error('Rollback failed:', err);
    process.exit(1);
  }
  console.log('Rollback completed successfully.');
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
});
